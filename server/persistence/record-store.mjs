import {projected, insert, update, municipality, resolvePrincipal, projectChildren} from './capture-projection.mjs';

/** Read capabilities used by records and attachment authorization. */
export function createRecordStore(database) {
 return {
async list(actor) {
 const r = await database.query(`SELECT r.*,a.snapshot,(SELECT jsonb_build_object('nombre',f.nombre,'mime',f.mime,'bytes',octet_length(f.contenido),'creadoEn',f.creado_en) FROM archivo_registro f WHERE f.id_registro=r.id_registro) AS acta FROM registro r JOIN auditoria_registro a ON a.id_registro=r.id_registro AND a.version_registro=r.version_registro WHERE r.id_funcionario=$1 ORDER BY r.actualizado_en DESC`, [actor.id_funcionario]);
 return r.rows;
},
  async isOwned(actor, id) {
   return Boolean((await database.query('SELECT 1 FROM registro WHERE id_registro=$1 AND id_funcionario=$2', [id, actor.id_funcionario])).rowCount);
  },
  async history(id) {
   return (await database.query('SELECT version_registro AS version,estado,creado_en FROM auditoria_registro WHERE id_registro=$1 ORDER BY version_registro DESC', [id])).rows;
  },
 };
}

/** The entire save operation receives one context bound to one PostgreSQL transaction. */
export function createRecordTransaction(runTransaction) {
 return work => runTransaction(client => work({
  async lock(id) {
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [id]);
   return (await client.query('SELECT * FROM registro WHERE id_registro=$1 FOR UPDATE', [id])).rows[0];
  },
  municipality: (...args) => municipality(client, ...args),
  async person(answers) {
   const result = await client.query(`INSERT INTO persona(tipo_documento,numero_documento) VALUES($1,$2) ON CONFLICT(tipo_documento,numero_documento) DO UPDATE SET numero_documento=EXCLUDED.numero_documento RETURNING id_persona`, [answers['section-1-1'] || 'CC', answers['section-1-2']]);
   return result.rows[0].id_persona;
  },
  async lockEvent(id) {
   return (await client.query('SELECT id_evento_especifico,creado_por FROM evento_especifico WHERE id_evento_especifico=$1 FOR UPDATE', [id])).rows[0];
  },
  async eventShared(eventId, recordId) {
   return Boolean((await client.query('SELECT 1 FROM desplazamiento WHERE id_evento_especifico=$1 AND id_registro<>$2 LIMIT 1', [eventId, recordId])).rowCount);
  },
  async updateEvent(id, answers) {
   return update(client, 'evento_especifico', 'id_evento_especifico', id, {...projected('evento_especifico', answers), id_evento_principal: await resolvePrincipal(client, answers), id_municipio: await municipality(client, answers, 2, 25, 26), actualizado_en: new Date()});
  },
  async createEvent(actor, answers) {
   const principal = await resolvePrincipal(client, answers);
   if (!principal) return null;
   return (await insert(client, 'evento_especifico', {...projected('evento_especifico', answers), id_evento_principal: principal, id_municipio: await municipality(client, answers, 2, 25, 26), creado_por: actor.id_funcionario})).id_evento_especifico;
  },
  async writeRecord(prior, id, answers, metadata) {
   const values = {...projected('registro', answers), ...metadata};
   return prior ? (await update(client, 'registro', 'id_registro', id, values)).rows[0] : await insert(client, 'registro', {id_registro: id, ...values});
  },
  project: (id, capture) => projectChildren(client, id, capture),
  async audit(actor, id, row, capture) {
   await insert(client, 'auditoria_registro', {id_registro: id, id_funcionario: actor.id_funcionario, version_registro: row.version_registro, estado: row.estado, snapshot: JSON.stringify(capture)});
  },
  async attachment(id) {
   return (await client.query('SELECT nombre,mime,octet_length(contenido) AS bytes,creado_en AS "creadoEn" FROM archivo_registro WHERE id_registro=$1', [id])).rows[0];
  },
 }));
}
