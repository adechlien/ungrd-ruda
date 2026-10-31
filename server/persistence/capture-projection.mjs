import { readFileSync } from 'node:fs';
import { ApiError } from '../errors.mjs';
import {
  GUIDE_CODES,
  SECTION_SCHEMAS,
  EVENT_PRINCIPALS_BY_TYPE,
  applicable,
  ethnicApplies,
} from '../generated/contract.mjs';
const maps = JSON.parse(readFileSync(new URL('../field-map.json', import.meta.url), 'utf8'));
const columns = JSON.parse(readFileSync(new URL('../model-columns.json', import.meta.url), 'utf8'));

function typed(type, value) {
  if (value == null || value === '') return null;
  if (type === 'boolean') return value === 'Sí' ? true : value === 'No' ? false : null;
  if (['integer', 'smallint', 'bigint', 'numeric(18,2)'].includes(type)) {
    const n = Number(value);
    if (type === 'numeric(18,2)' && n >= 1e16) return null;
    if ((type === 'integer' && n > 2147483647) || (type === 'smallint' && n > 32767)) return null;
    return Number.isFinite(n) && n >= 0 && (type === 'numeric(18,2)' || Number.isSafeInteger(n))
      ? n
      : null;
  }
  if (type === 'date')
    return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
      ? value
      : null;
  if (type === 'time') return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
  return value;
}
export function projected(table, answers, suffix = '') {
  const result = {};
  for (const [col, key] of Object.entries(maps[table] || {})) {
    const [, section, id] = key.match(/^section-(\d+)-(.+)$/);
    let value = applicable(Number(section), id, answers) ? answers[key + suffix] : null;
    const field = SECTION_SCHEMAS[Number(section) - 1].groups
      .flatMap((g) => g.fields)
      .find((f) => f.id === id);
    if (field?.options && value && !field.options.includes(value)) value = null;
    result[col] = typed(columns[table][col], value);
  }
  return result;
}
export async function insert(c, table, data) {
  const names = Object.keys(data);
  // Table and column identifiers are supplied by this module and checked-in mappings only.
  const result = await c.query(
    `INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
    Object.values(data),
  );
  return result.rows[0];
}
export async function update(c, table, idColumn, id, values) {
  const keys = Object.keys(values);
  return c.query(
    `UPDATE ${table} SET ${keys.map((k, i) => k + '=$' + (i + 1)).join(',')} WHERE ${idColumn}=$${keys.length + 1} RETURNING *`,
    [...Object.values(values), id],
  );
}
export async function municipality(c, a, section, dep, mun) {
  const r = await c.query(
    'SELECT m.id_municipio FROM municipio m JOIN departamento d USING(id_departamento) WHERE d.nombre=$1 AND m.nombre=$2',
    [a[`section-${section}-${dep}`] || '', a[`section-${section}-${mun}`] || ''],
  );
  return r.rows[0]?.id_municipio || null;
}

export async function resolvePrincipal(c, a) {
  if (!EVENT_PRINCIPALS_BY_TYPE[a['section-2-29']]?.includes(a['section-2-30'])) return null;
  const r = await c.query(
    `INSERT INTO evento_principal(id_tipo_evento,nombre) SELECT id_tipo_evento,$2 FROM tipo_evento WHERE nombre=$1 ON CONFLICT(id_tipo_evento,nombre) DO UPDATE SET activo=true RETURNING id_evento_principal`,
    [a['section-2-29'], a['section-2-30']],
  );
  return r.rows[0]?.id_evento_principal || null;
}
export async function projectChildren(c, id, capture) {
  const a = capture.answers;
  await c.query('DELETE FROM registro_declarante WHERE id_registro=$1', [id]);
  await insert(c, 'registro_declarante', {
    id_registro: id,
    ...projected('registro_declarante', a),
    id_municipio_residencia: await municipality(c, a, 1, 11, 12),
  });
  await c.query('DELETE FROM observacion_registro WHERE id_registro=$1', [id]);
  await insert(c, 'observacion_registro', { id_registro: id, observacion: capture.story || null });
  await c.query('DELETE FROM respuesta_guia WHERE id_registro=$1', [id]);
  for (const code of GUIDE_CODES[capture.selectedEvent] || [])
    if (a['guide-' + code])
      await insert(c, 'respuesta_guia', {
        id_registro: id,
        codigo_pregunta: code,
        respuesta: a['guide-' + code],
      });
  const hasDetails =
    capture.eventId || Object.entries(a).some(([k, v]) => k.startsWith('section-2-') && v);
  if (hasDetails) {
    const ds = (
      await c.query(
        'INSERT INTO desplazamiento(id_registro,id_evento_especifico) VALUES($1,$2) ON CONFLICT(id_registro) DO UPDATE SET id_evento_especifico=EXCLUDED.id_evento_especifico RETURNING id_desplazamiento',
        [id, capture.eventId],
      )
    ).rows[0].id_desplazamiento;
    await update(c, 'desplazamiento', 'id_desplazamiento', ds, {
      ...projected('desplazamiento', a),
      id_municipio_origen: await municipality(c, a, 2, 41, 42),
      id_municipio_actual: await municipality(c, a, 2, 48, 49),
    });
    await c.query('DELETE FROM certificacion_desplazamiento WHERE id_desplazamiento=$1', [ds]);
    const cert = projected('certificacion_desplazamiento', a);
    if (Object.values(cert).some((v) => v !== null))
      await insert(c, 'certificacion_desplazamiento', { id_desplazamiento: ds, ...cert });
  } else await c.query('DELETE FROM desplazamiento WHERE id_registro=$1', [id]);
  const previousCommunity = (
    await c.query(
      'SELECT c.id_comunidad,c.id_territorio FROM modulo_etnico m JOIN comunidad c USING(id_comunidad) JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1',
      [id],
    )
  ).rows[0];
  // Replace only this record's household projection; shared identities and events are untouched.
  await c.query('DELETE FROM hogar WHERE id_registro=$1', [id]);
  const hasHousehold =
    capture.members.length ||
    Object.entries(a).some(([k, v]) => /^section-[456]-/.test(k) && k !== 'section-6-applies' && v);
  if (!hasHousehold) return;
  const household = await insert(c, 'hogar', { id_registro: id, ...projected('hogar', a) });
  const docs = new Set();
  const memberMap = {
    apellidos_nombres: 'name',
    tipo_documento: 'document-type',
    numero_documento: 'document',
    fecha_nacimiento: 'birth',
    genero: 'gender',
    estado_civil: 'civil',
    ocupacion_previa: 'occupation',
    lugar_ocupacion_previa: 'occupation-place',
    escolaridad: 'schooling',
    lugar_inscripcion_cedula: 'vote-place',
    cedula_inscrita_votar: 'vote',
    estudiaba: 'study',
    lugar_estudio: 'study-place',
    trabajaba: 'work',
    lugar_trabajo_empleador: 'work-place',
    nivel_sisben: 'sisben',
    eps_salud: 'eps',
    relacion_declarante: 'relation',
    etnia: 'ethnicity',
    discapacidad: 'disability',
    gestante_lactante: 'pregnant',
    mujer_cabeza_familia: 'head',
  };
  for (const [index, m] of capture.members.entries()) {
    const key = (m['member-document-type'] || 'CC') + ':' + m['member-document'];
    if (m['member-document'] && docs.has(key))
      throw new ApiError(422, 'No repita integrantes con el mismo documento.');
    docs.add(key);
    await insert(c, 'miembro_hogar', {
      id_hogar: household.id_hogar,
      numero_orden: index + 1,
      ...Object.fromEntries(
        Object.entries(memberMap).map(([col, suffix]) => [
          col,
          typed(columns.miembro_hogar[col], m['member-' + suffix]),
        ]),
      ),
    });
  }
  for (const table of [
    'animal_domestico',
    'unidad_productiva',
    'necesidad_basica',
    'bien_inmueble',
    'bien_mueble_semoviente',
    'informacion_economica',
    'afectacion_salud',
  ]) {
    const prefixes = Object.values(maps[table]);
    const suffixes = new Set(['']);
    if (['animal_domestico', 'bien_inmueble', 'bien_mueble_semoviente'].includes(table))
      for (const key of Object.keys(a)) {
        const match = key.match(/^(.*)(--\d+)$/);
        if (match && prefixes.includes(match[1])) suffixes.add(match[2]);
      }
    for (const suffix of suffixes) {
      const values = projected(table, a, suffix);
      if (Object.values(values).some((v) => v !== null))
        await insert(c, table, { id_hogar: household.id_hogar, ...values });
    }
  }
  if (
    ethnicApplies(a) &&
    a['section-6-77']?.trim() &&
    a['section-6-78']?.trim() &&
    a['section-6-81']?.trim()
  ) {
    // Draft snapshots retain incomplete answers without inventing NOT NULL community data.
    let community;
    const territoryData = {
      tipo_territorio: a['section-6-78'],
      resolucion_acto: a['section-6-79'] || null,
    };
    const communityData = {
      nombre: a['section-6-77'],
      representante_nombre: a['section-6-81'],
      representante_cargo: a['section-6-representative-role'] || null,
      representante_documento: a['section-6-representative-document'] || null,
    };
    const shared =
      previousCommunity &&
      (
        await c.query('SELECT 1 FROM modulo_etnico WHERE id_comunidad=$1 LIMIT 1', [
          previousCommunity.id_comunidad,
        ])
      ).rowCount;
    if (previousCommunity && !shared && previousCommunity.id_territorio) {
      community = previousCommunity.id_comunidad;
      // A territory can itself be referenced by other communities.
      const territoryShared = (
        await c.query(
          'SELECT 1 FROM comunidad WHERE id_territorio=$1 AND id_comunidad<>$2 LIMIT 1',
          [previousCommunity.id_territorio, community],
        )
      ).rowCount;
      const territory = territoryShared
        ? (await insert(c, 'territorio_colectivo', territoryData)).id_territorio
        : previousCommunity.id_territorio;
      if (!territoryShared)
        await update(c, 'territorio_colectivo', 'id_territorio', territory, territoryData);
      await update(c, 'comunidad', 'id_comunidad', community, {
        ...communityData,
        id_territorio: territory,
      });
    } else {
      const territory = await insert(c, 'territorio_colectivo', territoryData);
      community = (
        await insert(c, 'comunidad', { id_territorio: territory.id_territorio, ...communityData })
      ).id_comunidad;
    }
    const module = await insert(c, 'modulo_etnico', {
      id_hogar: household.id_hogar,
      id_comunidad: community,
      ...projected('modulo_etnico', a),
    });
    await insert(c, 'seguimiento_etnico', {
      id_modulo_etnico: module.id_modulo_etnico,
      ...projected('seguimiento_etnico', a),
    });
  }
}
