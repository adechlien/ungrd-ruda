import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionService} from '../application/session-service.mjs';

function fixture() {
 let time = 0, sequence = 0;
 const rows = new Map();
 const actor = {id_usuario: '1', id_funcionario: '2', nombre_completo: 'Cuenta de prueba', correo: 'test@example.com', password_hash: 'stored', rol: 'funcionario', organizacion: 'UNGRD', tipo: 'UNGRD', documento: '123456'};
 const sessions = {
  async findActiveUser(email) {return email.toLowerCase() === actor.correo ? actor : null;},
  async findActiveSession(hash) {return rows.get(hash) || null;},
  async create(hash, userId) {assert.equal(userId, actor.id_usuario); rows.set(hash, actor);},
  async remove(hash) {rows.delete(hash);},
 };
 return {rows, actor, advance: value => {time += value;}, service: createSessionService({sessions,
  passwords: {verify: (value, hash) => value === 'correct' && hash === 'stored'},
  tokens: {create: () => 'token-' + ++sequence, hash: value => 'hash:' + value}, now: () => time})};
}

test('Sesion: el contrato inyectado permite login, autenticacion y logout sin exponer el hash', async () => {
 const {service, actor, rows} = fixture();
 const result = await service.login({email: ' TEST@example.com ', password: 'correct'}, 'client');
 assert.equal(result.user.funcionarioId, actor.id_funcionario);
 assert.ok(!('password_hash' in result.user));
 assert.ok(rows.has('hash:' + result.token));
 assert.ok(!rows.has(result.token));
 assert.equal(await service.authenticate(result.token), actor);
 await service.logout(result.token);
 await assert.rejects(service.authenticate(result.token), {status: 401});
});

test('Sesion: credenciales invalidas y sesiones ausentes usan los mismos errores del contrato HTTP', async () => {
 const {service, rows} = fixture();
 await assert.rejects(service.login({email: 'other@example.com', password: 'correct'}, 'one'), {status: 401});
 await assert.rejects(service.login({email: 'test@example.com', password: 'wrong'}, 'two'), {status: 401});
 await assert.rejects(service.login({email: [], password: 'correct'}, 'three'), {status: 400});
 await assert.rejects(service.authenticate(undefined), {status: 401});
 assert.equal(rows.size, 0);
});

test('Sesion: el limite se aísla por cliente y se renueva con el reloj inyectado', async () => {
 const {service, advance} = fixture();
 for (let i = 0; i < 10; i++) await assert.rejects(service.login({}, 'one'), {status: 400});
 await assert.rejects(service.login({}, 'one'), {status: 429});
 await assert.rejects(service.login({}, 'two'), {status: 400});
 advance(60001);
 assert.ok((await service.login({email: 'test@example.com', password: 'correct'}, 'one')).token);
});
