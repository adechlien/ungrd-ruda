import { readJson } from './db.mjs';
import { projectChildren, insert } from './repository-v8.mjs';
import { validateCapture, eventForType, GUIDE_OPTIONS, GUIDE_CODES } from './generated/contract.mjs';

const keys = readJson('./v7-to-v8-keys.json');
export function convertV7Capture(capture) {
 const answers = {};
 for (const [key, value] of Object.entries(capture.answers || {})) {
  const next = keys[key] || (key.startsWith('guide-') ? key : null);
  if (next) answers[next] = value;
 }
 for (const key of ['section-6-80','section-6-89','section-6-90']) if (answers[key] && !['Sí','No'].includes(answers[key])) delete answers[key];
 if (answers['section-2-52'] === 'Otra') answers['section-2-52'] = 'Otra (objetos de alto valor personal o sentimental)';
 if (!answers['section-6-applies'] && capture.answers?.['section-2-37'] === 'Sí') answers['section-6-applies'] = 'Sí';
 return { revisionRuda: 8, answers, story: capture.story || '', members: capture.members || [], selectedEvent: eventForType(answers['section-2-30'] || ''), eventId: capture.eventId ? String(capture.eventId) : null };
}

export async function migrateV8(c) {
 // All operations run in the same transaction as 010_ruda_v8.sql.
 for (const table of ['organizacion','funcionario','departamento']) await c.query(`INSERT INTO ${table} SELECT * FROM ruda_legacy_v7.${table}`);
 await c.query('INSERT INTO municipio SELECT id_municipio,id_departamento,codigo,nombre,coalesce(es_pdet,false) FROM ruda_legacy_v7.municipio');
 await c.query('INSERT INTO usuario SELECT id_usuario,id_funcionario,correo,password_hash,rol::rol_usuario,activo FROM ruda_legacy_v7.usuario');
 await c.query('INSERT INTO sesion SELECT * FROM ruda_legacy_v7.sesion');
 await c.query('INSERT INTO persona SELECT id_persona,tipo_documento,numero_documento FROM ruda_legacy_v7.persona WHERE tipo_documento IS NOT NULL AND numero_documento IS NOT NULL');
 await c.query('INSERT INTO tipo_evento(id_tipo_evento,nombre) SELECT id_categoria,nombre FROM ruda_legacy_v7.categoria_evento');
 await c.query('INSERT INTO evento_principal(id_evento_principal,id_tipo_evento,nombre) SELECT id_tipo_evento,id_categoria,nombre FROM ruda_legacy_v7.tipo_evento');
 await c.query(`INSERT INTO evento_especifico(id_evento_especifico,id_evento_principal,id_municipio,fecha_inicio,hora_inicio,vereda_barrio_sector,direccion,evolucion,autoridad_alerta,declaratoria_oficial,numero_decreto_calamidad,creado_por,creado_en,actualizado_en)
 SELECT e.id_evento,e.id_tipo_evento,e.id_municipio,e.fecha_inicio,e.hora_inicio,e.vereda_barrio_sector,e.direccion,e.evolucion_evento,e.autoridad_alerta,e.declaratoria_calamidad,e.entidad_acto_administrativo,
 coalesce((SELECT min(d.id_funcionario) FROM ruda_legacy_v7.desplazamiento ds JOIN ruda_legacy_v7.declaracion d USING(id_declaracion) WHERE ds.id_evento=e.id_evento),(SELECT min(id_funcionario) FROM funcionario)),e.creado_en,e.creado_en FROM ruda_legacy_v7.evento e`);
 for (const group of GUIDE_OPTIONS) for (const [i, code] of GUIDE_CODES[group.id].entries()) await insert(c, 'pregunta_guia', { codigo: code, grupo_evento: group.id, revision_ruda: 8, texto: group.questions[i], orden: i });
 const records = (await c.query('SELECT * FROM ruda_legacy_v7.declaracion ORDER BY creado_en,id_declaracion')).rows;
 let review = 0;
 for (const r of records) {
  const capture = convertV7Capture(r.datos_declarados);
  const actor = (await c.query('SELECT * FROM funcionario WHERE id_funcionario=$1', [r.id_funcionario])).rows[0];
  const requiresReview = r.estado === 'terminado' && validateCapture(capture).length > 0;
  if (requiresReview) review++;
  await insert(c, 'registro', { id_registro: r.id_declaracion, id_persona_declarante: r.id_persona_declarante, id_funcionario: r.id_funcionario, id_organizacion_receptora: r.id_organizacion_receptora || actor.id_organizacion, id_municipio_declaracion: r.id_municipio_declaracion, direccion_declaracion: r.direccion_declaracion, fecha_declaracion: r.fecha_declaracion, tipo_declaracion: r.tipo_declaracion, estado: requiresReview ? 'borrador' : r.estado, version_formato: 5, revision_ruda: 8, version_registro: r.version + 1, creado_en: r.creado_en, actualizado_en: new Date(), terminado_en: requiresReview ? null : r.terminado_en });
  await projectChildren(c, r.id_declaracion, capture);
  const history = (await c.query('SELECT * FROM ruda_legacy_v7.auditoria_declaracion WHERE id_declaracion=$1 ORDER BY version', [r.id_declaracion])).rows;
  for (const a of history) await insert(c, 'auditoria_registro', { id_registro: a.id_declaracion, id_funcionario: a.id_funcionario, version_registro: a.version, estado: a.estado, snapshot: JSON.stringify(convertV7Capture(a.datos_declarados)), creado_en: a.creado_en });
  await insert(c, 'auditoria_registro', { id_registro: r.id_declaracion, id_funcionario: r.id_funcionario, version_registro: r.version + 1, estado: requiresReview ? 'borrador' : r.estado, snapshot: JSON.stringify(capture) });
 }
 const identities = (await c.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND is_identity='YES'")).rows;
 for (const { table_name, column_name } of identities) await c.query(`SELECT setval(pg_get_serial_sequence($1,$2),coalesce(max(${column_name}),1),count(*)>0) FROM ${table_name}`, [table_name, column_name]);
 console.log(`RUDA v8: ${records.length} registros conservados; ${review} terminados requieren completar información v8. Archivo original: ruda_legacy_v7.`);
}
