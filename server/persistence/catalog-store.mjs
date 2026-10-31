import { departamentos } from 'colombia-territorial';
import { GUIDE_OPTIONS, GUIDE_CODES, EVENT_PRINCIPALS_BY_TYPE } from '../generated/contract.mjs';

/** Catálogos de una instalación v8; recibe la transacción del llamador. */
export async function prepareCatalogs(c) {
  for (const dep of departamentos) {
    const d = await c.query(
      'INSERT INTO departamento(codigo,nombre) VALUES($1,$2) ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_departamento',
      [dep.codigo_dane, dep.nombre],
    );
    for (const m of dep.municipios)
      await c.query(
        'INSERT INTO municipio(id_departamento,codigo,nombre) VALUES($1,$2,$3) ON CONFLICT(codigo) DO NOTHING',
        [d.rows[0].id_departamento, m.codigo_dane, m.nombre],
      );
  }
  for (const group of GUIDE_OPTIONS)
    for (const [i, code] of GUIDE_CODES[group.id].entries())
      await c.query(
        'INSERT INTO pregunta_guia(codigo,grupo_evento,revision_ruda,texto,orden) VALUES($1,$2,8,$3,$4) ON CONFLICT(codigo) DO NOTHING',
        [code, group.id, group.questions[i], i],
      );
  for (const [category, principals] of Object.entries(EVENT_PRINCIPALS_BY_TYPE)) {
    const type = (
      await c.query(
        'INSERT INTO tipo_evento(nombre) VALUES($1) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_tipo_evento',
        [category],
      )
    ).rows[0];
    for (const principal of principals)
      await c.query(
        'INSERT INTO evento_principal(id_tipo_evento,nombre) VALUES($1,$2) ON CONFLICT(id_tipo_evento,nombre) DO NOTHING',
        [type.id_tipo_evento, principal],
      );
  }
}

export async function ensureOrganization(c) {
  let org = (
    await c.query('SELECT id_organizacion FROM organizacion ORDER BY id_organizacion LIMIT 1')
  ).rows[0];
  if (!org)
    org = (
      await c.query(
        "INSERT INTO organizacion(nombre,tipo) VALUES('Unidad Nacional para la Gestión del Riesgo de Desastres','UNGRD') RETURNING id_organizacion",
      )
    ).rows[0];
  return org.id_organizacion;
}
