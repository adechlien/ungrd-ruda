import {randomBytes} from 'node:crypto';
import {pool} from './db.mjs';
import {hashToken, verifyPassword} from './auth.mjs';
import {ApiError} from './errors.mjs';
import {listForms, listEvents, saveForm} from './repository.mjs';
import {saveActa, getActa, deleteActa} from './acta.mjs';
import {getStatistics} from './statistics.mjs';
import {createSessionStore} from './persistence/session-store.mjs';
import {createSessionService} from './application/session-service.mjs';
import {createApp} from './http/create-app.mjs';

export function composeApp(environment = process.env) {
 const sessions = createSessionService({
  sessions: createSessionStore(pool), passwords: {verify: verifyPassword},
  tokens: {create: () => randomBytes(32).toString('hex'), hash: hashToken},
 });
 const records = {
  list: listForms, save: saveForm,
  async history(actor, id) {
   const own = await pool.query('SELECT 1 FROM registro WHERE id_registro=$1 AND id_funcionario=$2', [id, actor.id_funcionario]);
   if (!own.rowCount) throw new ApiError(404, 'Registro no encontrado.');
   return (await pool.query('SELECT version_registro AS version,estado,creado_en FROM auditoria_registro WHERE id_registro=$1 ORDER BY version_registro DESC', [id])).rows;
  },
 };
 return createApp({sessions, records, events: {list: listEvents}, attachments: {save: saveActa, get: getActa, remove: deleteActa}, statistics: {get: getStatistics}, health: () => pool.query('SELECT 1')}, {
  mode: environment.NODE_ENV, trustProxy: environment.TRUST_PROXY,
  origins: ['http://localhost:4305', 'http://127.0.0.1:4305', 'http://localhost:4310', 'http://127.0.0.1:4310',
   'http://localhost:' + Number(environment.API_PORT || 4310), 'http://127.0.0.1:' + Number(environment.API_PORT || 4310),
   ...(environment.APP_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean)],
 });
}
