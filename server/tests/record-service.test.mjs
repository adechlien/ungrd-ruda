import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRecordService} from '../application/record-service.mjs';
import {createAttachmentService} from '../application/attachment-service.mjs';

const id = '9b28eec3-658a-4c98-a723-b3c840e827e1';
const actor = {id_funcionario: '7', id_organizacion: '3', nombre_completo: 'Funcionario real', documento: '7654321'};
const capture = () => ({revisionRuda: 8, version: 0, answers: {'section-1-2': '123456789'}, story: '', members: [], eventId: null});
function fixture(overrides = {}) {
 const calls = [];
 const time = new Date('2026-01-01T00:00:00Z');
 const context = {
  async lock() {calls.push('lock'); return null;},
  async municipality() {return 1;}, async person() {return '4';},
  async lockEvent() {return {creado_por: '99'};},
  async writeRecord(prior, recordId, answers, metadata) {
   calls.push('write');
   assert.equal(answers['section-1-19'], actor.nombre_completo);
   assert.equal(answers['section-1-20'], actor.documento);
   return {id_registro: recordId, creado_en: time, version_formato: 5, ...metadata};
  },
  async project() {calls.push('project');}, async audit() {calls.push('audit');}, async attachment() {return null;}, ...overrides,
 };
 const service = createRecordService({records: {}, transaction: async work => {calls.push('transaction'); return work(context);}, now: () => time});
 return {service, calls};
}

test('Registro: valida antes de abrir la transaccion y asigna el funcionario autenticado', async () => {
 const {service, calls} = fixture();
 await assert.rejects(service.save(actor, id, {...capture(), revisionRuda: 7}), {status: 409});
 assert.deepEqual(calls, []);
 const input = capture();input.answers['section-1-19'] = 'Funcionario falsificado';
 const result = await service.save(actor, id, input);
 assert.equal(result.status, 'pending');assert.equal(result.version, 1);
 assert.deepEqual(calls, ['transaction', 'lock', 'write', 'project', 'audit']);
});

test('Registro: version antigua y propietario ajeno se rechazan antes de cualquier escritura', async () => {
 for (const [prior, status] of [[{id_funcionario: '99', version_registro: 1}, 404], [{id_funcionario: '7', version_registro: 1}, 409]]) {
  const {service, calls} = fixture({lock: async () => prior});
  await assert.rejects(service.save(actor, id, capture()), {status});
  assert.ok(!calls.includes('write'));assert.ok(!calls.includes('audit'));
 }
});

test('Registro: la autorizacion de eventos sigue siendo obligatoria con un adaptador sustituido', async () => {
 const {service, calls} = fixture();
 await assert.rejects(service.save(actor, id, {...capture(), eventId: '1'}), {status: 422});
 assert.ok(!calls.includes('write'));assert.ok(!calls.includes('audit'));
});

test('Adjunto: el contrato de archivos no permite saltar la propiedad ni la firma binaria', async () => {
 let owned = false, writes = 0;
 const service = createAttachmentService({records: {isOwned: async () => owned}, files: {save: async () => {writes++;}}, newId: () => 'file'});
 const pdf = Buffer.from('%PDF-1.4\nPrueba');
 await assert.rejects(service.save(actor, id, 'test.pdf', pdf), {status: 404});
 owned = true;
 await assert.rejects(service.save(actor, id, 'test.pdf', Buffer.from('not a PDF')), {status: 422});
 assert.equal(writes, 0);
 await service.save(actor, id, 'test.pdf', pdf);assert.equal(writes, 1);
});
