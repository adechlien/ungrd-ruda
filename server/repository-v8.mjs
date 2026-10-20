import { pool, transaction, readJson } from './db.mjs';
import { validateCapture, captureProgress, firstIncomplete, eventForType, GUIDE_CODES, SECTION_SCHEMAS, EVENT_PRINCIPALS_BY_TYPE, applicable, ethnicApplies, repeatedKey } from './generated/contract.mjs';

const maps = readJson('./field-map.json');
const columns = readJson('./model-columns.json');
export class ApiError extends Error {
 constructor(status, message, issues = []) { super(message); this.status = status; this.issues = issues; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownKeys = new Set(SECTION_SCHEMAS.flatMap((s, si) => s.groups.flatMap(g => g.fields.map(f => `section-${si + 1}-${f.id}`))));
knownKeys.add('section-6-applies');
Object.values(GUIDE_CODES).flat().forEach(code => knownKeys.add('guide-' + code));

export function sanitize(input) {
 if (input?.revisionRuda !== 8) throw new ApiError(409, 'El formulario usa una revisión anterior. Recargue la página para usar RUDA v8.');
 if (!input.answers || Array.isArray(input.answers) || typeof input.answers !== 'object') throw new ApiError(400, 'Registro inválido.');
 const answers = {};
 for (const [key, value] of Object.entries(input.answers)) {
  const repeated=key.match(/^(.*)--(\d+)$/);
  const allowed=knownKeys.has(key) || (repeated && Number(repeated[2])>=2 && Number(repeated[2])<=100 && knownKeys.has(repeated[1]) && repeatedKey(repeated[1]));
  if (!allowed || typeof value !== 'string' || value.length > 10000) throw new ApiError(400, 'Respuesta no admitida.');
  answers[key] = value.trim();
 }
 if (typeof input.story !== 'string' || input.story.length > 100000 || !Array.isArray(input.members) || input.members.length > 100) throw new ApiError(400, 'Narración o integrantes inválidos.');
 const memberFields = new Set(SECTION_SCHEMAS[3].groups.find(g => g.title === 'Miembros del hogar').fields.map(f => f.id));
 memberFields.add('member-declarant'); memberFields.add('member-review');
 const members = input.members.map(m => {
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new ApiError(400, 'Integrante inválido.');
  const result = {};
  for (const [k, v] of Object.entries(m)) {
   if (!memberFields.has(k) || typeof v !== 'string' || v.length > 1000) throw new ApiError(400, 'Datos de integrante inválidos.');
   result[k] = v.trim();
  }
  return result;
 });
 if (input.eventId != null && (!/^[1-9]\d{0,18}$/.test(String(input.eventId)) || BigInt(input.eventId)>9223372036854775807n)) throw new ApiError(400, 'Evento inválido.');
 return { revisionRuda: 8, answers, story: input.story, selectedEvent: eventForType(answers['section-2-30'] || ''), members, eventId: input.eventId ? String(input.eventId) : null };
}

function typed(type, value) {
 if (value == null || value === '') return null;
 if (type === 'boolean') return value === 'Sí' ? true : value === 'No' ? false : null;
 if (['integer', 'smallint', 'bigint', 'numeric(18,2)'].includes(type)) {
  const n = Number(value);
  if(type==='numeric(18,2)'&&n>=1e16)return null;
  if(type==='integer'&&n>2147483647 || type==='smallint'&&n>32767)return null;
  return Number.isFinite(n) && n >= 0 && (type === 'numeric(18,2)' || Number.isSafeInteger(n)) ? n : null;
 }
 if (type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : null;
 if (type === 'time') return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
 return value;
}
function projected(table, answers, suffix = '') {
 const result = {};
 for (const [col, key] of Object.entries(maps[table] || {})) {
  const [, section, id] = key.match(/^section-(\d+)-(.+)$/);
  let value = applicable(Number(section), id, answers) ? answers[key+suffix] : null;
  const field = SECTION_SCHEMAS[Number(section) - 1].groups.flatMap(g => g.fields).find(f => f.id === id);
  if (field?.options && value && !field.options.includes(value)) value = null;
  result[col] = typed(columns[table][col], value);
 }
 return result;
}
export async function insert(c, table, data) {
 const names = Object.keys(data);
 // Table and column identifiers are supplied by this module and checked-in mappings only.
 const result = await c.query(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`, Object.values(data));
 return result.rows[0];
}
async function update(c, table, idColumn, id, values) {
 const keys = Object.keys(values);
 return c.query(`UPDATE ${table} SET ${keys.map((k, i) => k + '=$' + (i + 1)).join(',')} WHERE ${idColumn}=$${keys.length + 1} RETURNING *`, [...Object.values(values), id]);
}
async function municipality(c, a, section, dep, mun) {
 const r = await c.query('SELECT m.id_municipio FROM municipio m JOIN departamento d USING(id_departamento) WHERE d.nombre=$1 AND m.nombre=$2', [a[`section-${section}-${dep}`] || '', a[`section-${section}-${mun}`] || '']);
 return r.rows[0]?.id_municipio || null;
}

export function toRecord(row) {
 const capture = row.snapshot;
 return { ...capture, acta:row.acta||null, revisionRuda: 8, versionFormato: row.version_formato, id: row.id_registro, status: row.estado === 'terminado' ? 'completed' : 'pending', createdAt: row.creado_en.toISOString(), savedAt: row.actualizado_en.toISOString(), finishedAt: row.terminado_en?.toISOString() || null, version: row.version_registro, activeSection: firstIncomplete(capture), progress: captureProgress(capture) };
}
export async function listForms(actor) {
 const r = await pool.query(`SELECT r.*,a.snapshot,(SELECT jsonb_build_object('nombre',f.nombre,'mime',f.mime,'bytes',octet_length(f.contenido),'creadoEn',f.creado_en) FROM archivo_registro f WHERE f.id_registro=r.id_registro) AS acta FROM registro r JOIN auditoria_registro a ON a.id_registro=r.id_registro AND a.version_registro=r.version_registro WHERE r.id_funcionario=$1 ORDER BY r.actualizado_en DESC`, [actor.id_funcionario]);
 return r.rows.map(toRecord);
}
export async function listEvents(actor) {
 const r = await pool.query(`SELECT e.id_evento_especifico AS id, concat_ws(' · ',p.nombre,coalesce(m.nombre,'Ubicación pendiente')) AS nombre,
 p.nombre AS tipo,t.nombre AS categoria,m.nombre AS municipio,d.nombre AS departamento,e.vereda_barrio_sector AS sector,e.direccion,
 e.fecha_inicio::text AS fecha,to_char(e.hora_inicio,'HH24:MI') AS hora,
 count(DISTINCT r.id_registro)::int AS declarations,count(DISTINCT r.id_registro)::int AS "myDeclarations",count(DISTINCT h.id_hogar)::int AS households,
 (SELECT count(DISTINCT identity)::int FROM (
   SELECT pe.tipo_documento||':'||pe.numero_documento AS identity FROM registro r2 JOIN persona pe ON pe.id_persona=r2.id_persona_declarante JOIN desplazamiento ds2 USING(id_registro) WHERE ds2.id_evento_especifico=e.id_evento_especifico AND r2.estado='terminado' AND r2.id_funcionario=$1
   UNION SELECT CASE WHEN nullif(mh.numero_documento,'') IS NULL THEN 'member:'||mh.id_miembro_hogar ELSE coalesce(mh.tipo_documento,'CC')||':'||mh.numero_documento END FROM registro r2 JOIN desplazamiento ds2 USING(id_registro) JOIN hogar h2 USING(id_registro) JOIN miembro_hogar mh USING(id_hogar) WHERE ds2.id_evento_especifico=e.id_evento_especifico AND r2.estado='terminado' AND r2.id_funcionario=$1
 ) people) AS "affectedPeople",
 jsonb_agg(DISTINCT jsonb_build_object('id',r.id_registro,'name',trim(concat_ws(' ',rd.primer_nombre,rd.demas_nombres,rd.primer_apellido,rd.segundo_apellido)),'document',pe.numero_documento,'status','completed','updatedAt',r.actualizado_en)) AS records
 FROM evento_especifico e JOIN desplazamiento ds USING(id_evento_especifico) JOIN registro r USING(id_registro)
 LEFT JOIN registro_declarante rd USING(id_registro) LEFT JOIN persona pe ON pe.id_persona=r.id_persona_declarante LEFT JOIN hogar h USING(id_registro)
 LEFT JOIN evento_principal p USING(id_evento_principal) LEFT JOIN tipo_evento t USING(id_tipo_evento)
 LEFT JOIN municipio m ON m.id_municipio=e.id_municipio LEFT JOIN departamento d ON d.id_departamento=m.id_departamento
 WHERE r.estado='terminado' AND r.id_funcionario=$1
 GROUP BY e.id_evento_especifico,p.nombre,t.nombre,m.nombre,d.nombre ORDER BY e.creado_en DESC`, [actor.id_funcionario]);
 return r.rows;
}
async function resolvePrincipal(c, a) {
 if (!EVENT_PRINCIPALS_BY_TYPE[a['section-2-29']]?.includes(a['section-2-30'])) return null;
 const r = await c.query(`INSERT INTO evento_principal(id_tipo_evento,nombre) SELECT id_tipo_evento,$2 FROM tipo_evento WHERE nombre=$1 ON CONFLICT(id_tipo_evento,nombre) DO UPDATE SET activo=true RETURNING id_evento_principal`, [a['section-2-29'], a['section-2-30']]);
 return r.rows[0]?.id_evento_principal || null;
}
export async function saveForm(actor, id, input, finish = false) {
 if (!uuid.test(id)) throw new ApiError(400, 'Identificador de registro inválido.');
 const capture = sanitize(input), a = capture.answers;
 a['section-1-0'] = id; a['section-1-19'] = actor.nombre_completo; a['section-1-20'] = actor.documento;
 const issues = validateCapture(capture, finish);
 if (issues.length) throw new ApiError(422, issues[0].message, issues);
 return transaction(async c => {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [id]);
  const prior = (await c.query('SELECT * FROM registro WHERE id_registro=$1 FOR UPDATE', [id])).rows[0];
  if (prior && String(prior.id_funcionario) !== String(actor.id_funcionario)) throw new ApiError(404, 'Registro no encontrado.');
  if (prior && input.version !== prior.version_registro) throw new ApiError(409, 'El registro cambió en otra sesión. Recárguelo antes de guardar.');
  if (!prior && input.version && input.version !== 0) throw new ApiError(409, 'No se encontró la versión del registro.');
  let validGeography=true;
  if (finish||prior?.estado==='terminado') for (const [section, dep, mun] of [[1,11,12],[1,15,16],[2,25,26],[2,41,42],[2,48,49]]) {
   if (!await municipality(c, a, section, dep, mun)) {
    validGeography=false;
    if(finish)throw new ApiError(422, 'Seleccione un departamento y municipio compatibles.', [{ section, field: String(mun), message: 'Municipio inválido.' }]);
   }
  }
  const pe = await c.query(`INSERT INTO persona(tipo_documento,numero_documento) VALUES($1,$2) ON CONFLICT(tipo_documento,numero_documento) DO UPDATE SET numero_documento=EXCLUDED.numero_documento RETURNING id_persona`, [a['section-1-1'] || 'CC', a['section-1-2']]);
  let eventId = capture.eventId;
  if (eventId) {
   // Serialize event edits as well as association, including first-time associations.
   const event = await c.query('SELECT id_evento_especifico FROM evento_especifico WHERE id_evento_especifico=$1 FOR UPDATE', [eventId]);
   if (!event.rowCount) throw new ApiError(422, 'El evento seleccionado no existe.');
   const others = await c.query('SELECT 1 FROM desplazamiento WHERE id_evento_especifico=$1 AND id_registro<>$2 LIMIT 1', [eventId, id]);
   if (!others.rowCount && a['section-2-30']) await update(c, 'evento_especifico', 'id_evento_especifico', eventId, { ...projected('evento_especifico', a), id_evento_principal: await resolvePrincipal(c, a), id_municipio: await municipality(c, a, 2, 25, 26), actualizado_en: new Date() });
  } else if (a['section-2-30']) {
   const principal = await resolvePrincipal(c, a);
   if (principal) eventId = (await insert(c, 'evento_especifico', { ...projected('evento_especifico', a), id_evento_principal: principal, id_municipio: await municipality(c, a, 2, 25, 26), creado_por: actor.id_funcionario })).id_evento_especifico;
  }
  capture.eventId = eventId ? String(eventId) : null;
  const status = finish || (prior?.estado === 'terminado' && validGeography && !validateCapture(capture).length) ? 'terminado' : 'borrador';
  const data = { ...projected('registro', a), id_persona_declarante: pe.rows[0].id_persona, id_funcionario: actor.id_funcionario, id_organizacion_receptora: actor.id_organizacion, id_municipio_declaracion: await municipality(c, a, 1, 15, 16), estado: status, terminado_en: status === 'terminado' ? prior?.terminado_en || new Date() : null, version_registro: (prior?.version_registro || 0) + 1, actualizado_en: new Date() };
  const row = prior ? (await update(c, 'registro', 'id_registro', id, data)).rows[0] : await insert(c, 'registro', { id_registro: id, ...data });
  await projectChildren(c, id, capture);
  await insert(c, 'auditoria_registro', { id_registro: id, id_funcionario: actor.id_funcionario, version_registro: row.version_registro, estado: status, snapshot: JSON.stringify(capture) });
  const acta=(await c.query('SELECT nombre,mime,octet_length(contenido) AS bytes,creado_en AS "creadoEn" FROM archivo_registro WHERE id_registro=$1',[id])).rows[0];
  return toRecord({ ...row, snapshot: capture,acta });
 });
}

export async function projectChildren(c, id, capture) {
 const a = capture.answers;
 await c.query('DELETE FROM registro_declarante WHERE id_registro=$1', [id]);
 await insert(c, 'registro_declarante', { id_registro: id, ...projected('registro_declarante', a), id_municipio_residencia: await municipality(c, a, 1, 11, 12) });
 await c.query('DELETE FROM observacion_registro WHERE id_registro=$1', [id]);
 await insert(c, 'observacion_registro', { id_registro: id, observacion: capture.story || null });
 await c.query('DELETE FROM respuesta_guia WHERE id_registro=$1', [id]);
 for (const code of GUIDE_CODES[capture.selectedEvent] || []) if (a['guide-' + code]) await insert(c, 'respuesta_guia', { id_registro: id, codigo_pregunta: code, respuesta: a['guide-' + code] });
 const hasDetails = capture.eventId || Object.entries(a).some(([k,v]) => k.startsWith('section-2-') && v);
 if (hasDetails) {
  const ds = (await c.query('INSERT INTO desplazamiento(id_registro,id_evento_especifico) VALUES($1,$2) ON CONFLICT(id_registro) DO UPDATE SET id_evento_especifico=EXCLUDED.id_evento_especifico RETURNING id_desplazamiento', [id, capture.eventId])).rows[0].id_desplazamiento;
  await update(c, 'desplazamiento', 'id_desplazamiento', ds, { ...projected('desplazamiento', a), id_municipio_origen: await municipality(c, a, 2, 41, 42), id_municipio_actual: await municipality(c, a, 2, 48, 49) });
  await c.query('DELETE FROM certificacion_desplazamiento WHERE id_desplazamiento=$1', [ds]);
  const cert = projected('certificacion_desplazamiento', a);
  if (Object.values(cert).some(v => v !== null)) await insert(c, 'certificacion_desplazamiento', { id_desplazamiento: ds, ...cert });
 } else await c.query('DELETE FROM desplazamiento WHERE id_registro=$1', [id]);
 const previousCommunity = (await c.query('SELECT c.id_comunidad,c.id_territorio FROM modulo_etnico m JOIN comunidad c USING(id_comunidad) JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1', [id])).rows[0];
 // Replace only this record's household projection; shared identities and events are untouched.
 await c.query('DELETE FROM hogar WHERE id_registro=$1', [id]);
 const hasHousehold = capture.members.length || Object.entries(a).some(([k,v]) => /^section-[456]-/.test(k) && k !== 'section-6-applies' && v);
 if (!hasHousehold) return;
 const household = await insert(c, 'hogar', { id_registro: id, ...projected('hogar', a) });
 const docs = new Set();
 const memberMap = { apellidos_nombres:'name',tipo_documento:'document-type',numero_documento:'document',fecha_nacimiento:'birth',genero:'gender',estado_civil:'civil',ocupacion_previa:'occupation',lugar_ocupacion_previa:'occupation-place',escolaridad:'schooling',lugar_inscripcion_cedula:'vote-place',cedula_inscrita_votar:'vote',estudiaba:'study',lugar_estudio:'study-place',trabajaba:'work',lugar_trabajo_empleador:'work-place',nivel_sisben:'sisben',eps_salud:'eps',relacion_declarante:'relation',etnia:'ethnicity',discapacidad:'disability',gestante_lactante:'pregnant',mujer_cabeza_familia:'head' };
 for (const [index, m] of capture.members.entries()) {
  const key = (m['member-document-type'] || 'CC') + ':' + m['member-document'];
  if (m['member-document'] && docs.has(key)) throw new ApiError(422, 'No repita integrantes con el mismo documento.');
  docs.add(key);
  await insert(c, 'miembro_hogar', { id_hogar: household.id_hogar, numero_orden: index + 1, ...Object.fromEntries(Object.entries(memberMap).map(([col, suffix]) => [col, typed(columns.miembro_hogar[col], m['member-' + suffix])])) });
 }
 for (const table of ['animal_domestico','unidad_productiva','necesidad_basica','bien_inmueble','bien_mueble_semoviente','informacion_economica','afectacion_salud']) {
  const prefixes=Object.values(maps[table]);
  const suffixes=new Set(['']);
  if(['animal_domestico','bien_inmueble','bien_mueble_semoviente'].includes(table))for(const key of Object.keys(a)) {
   const match=key.match(/^(.*)(--\d+)$/);if(match&&prefixes.includes(match[1]))suffixes.add(match[2]);
  }
  for(const suffix of suffixes){
   const values = projected(table, a, suffix);
   if (Object.values(values).some(v => v !== null)) await insert(c, table, { id_hogar: household.id_hogar, ...values });
  }
 }
 if (ethnicApplies(a) && a['section-6-77']?.trim() && a['section-6-78']?.trim() && a['section-6-81']?.trim()) {
  // Draft snapshots retain incomplete answers without inventing NOT NULL community data.
  let community;
  const territoryData = { tipo_territorio: a['section-6-78'], resolucion_acto: a['section-6-79'] || null };
  const communityData = { nombre: a['section-6-77'], representante_nombre: a['section-6-81'], representante_cargo: a['section-6-representative-role'] || null, representante_documento: a['section-6-representative-document'] || null };
  const shared = previousCommunity && (await c.query('SELECT 1 FROM modulo_etnico WHERE id_comunidad=$1 LIMIT 1', [previousCommunity.id_comunidad])).rowCount;
  if (previousCommunity && !shared && previousCommunity.id_territorio) {
   community = previousCommunity.id_comunidad;
   // A territory can itself be referenced by other communities.
   const territoryShared = (await c.query('SELECT 1 FROM comunidad WHERE id_territorio=$1 AND id_comunidad<>$2 LIMIT 1',[previousCommunity.id_territorio,community])).rowCount;
   const territory = territoryShared ? (await insert(c,'territorio_colectivo',territoryData)).id_territorio : previousCommunity.id_territorio;
   if (!territoryShared) await update(c,'territorio_colectivo','id_territorio',territory,territoryData);
   await update(c,'comunidad','id_comunidad',community,{...communityData,id_territorio:territory});
  } else {
   const territory = await insert(c, 'territorio_colectivo', territoryData);
   community = (await insert(c, 'comunidad', { id_territorio: territory.id_territorio, ...communityData })).id_comunidad;
  }
  const module = await insert(c, 'modulo_etnico', { id_hogar: household.id_hogar, id_comunidad: community, ...projected('modulo_etnico', a) });
  await insert(c, 'seguimiento_etnico', { id_modulo_etnico: module.id_modulo_etnico, ...projected('seguimiento_etnico', a) });
 }
}
