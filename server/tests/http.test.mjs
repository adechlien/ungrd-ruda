import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../http/create-app.mjs';
import {ApiError} from '../errors.mjs';

async function fixture(t, overrides = {}, config = {}) {
 const actor = {id_usuario: '1', id_funcionario: '2', nombre_completo: 'Prueba'};
 const services = {sessions: {
  async login() {return {token: 'opaque', user: {id: '1'}};},
  async authenticate(token) {if (token !== 'opaque') throw new ApiError(401, 'Inicie sesión para continuar.'); return actor;},
  async logout(token) {assert.equal(token, 'opaque');},
 }, records: {list: async who => [{owner: who.id_funcionario}]}, health: async () => {}, ...overrides};
 const app = createApp(services, {mode: 'production', origins: ['https://ruda.example'], logger: {error() {}}, ...config});
 const server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 t.after(() => new Promise(resolve => {server.closeAllConnections(); server.close(resolve);}));
 return {base: `http://127.0.0.1:${server.address().port}/api`, actor};
}

test('HTTP: health publico, sesion segura y autorizacion preceden a los controladores', async t => {
 const {base} = await fixture(t);
 assert.equal((await fetch(base + '/health')).status, 200);
 assert.equal((await fetch(base + '/forms')).status, 401);
 const login = await fetch(base + '/auth/login', {method: 'POST', headers: {Origin: 'https://ruda.example', 'Content-Type': 'application/json'}, body: '{}'});
 assert.equal(login.status, 200);
 assert.match(login.headers.get('set-cookie'), /HttpOnly/);
 assert.match(login.headers.get('set-cookie'), /Secure/);
 assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
 const headers = {Cookie: 'ruda_session=opaque'};
 assert.deepEqual(await (await fetch(base + '/forms', {headers})).json(), [{owner: '2'}]);
 assert.equal((await fetch(base + '/auth/logout', {method: 'POST', headers})).status, 204);
 assert.equal((await fetch(base + '/auth/login', {method: 'POST', headers: {Origin: 'https://outside.example'}})).status, 403);
});

test('HTTP: errores de infraestructura se traducen sin exponer sus detalles', async t => {
 const {base} = await fixture(t, {records: {list: async () => {throw Error('secret database detail');}}});
 const response = await fetch(base + '/forms', {headers: {Cookie: 'ruda_session=opaque'}});
 assert.equal(response.status, 500);
 assert.deepEqual(await response.json(), {message: 'No se pudo completar la operación.', issues: []});
});
