import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECTION_SCHEMAS, ethnicApplies, applicable, captureProgress, captureStats, validateCapture, syncDeclarant, memberNeedsCompletion, householdComplete, finishProgress, eventForType } from '../generated/contract.mjs';

const ethnicFields = SECTION_SCHEMAS[5].groups.flatMap(group => group.fields);
const capture = answers => ({ answers, story: '', selectedEvent: 'inundacion', members: [] });

test('El switch apagado excluye el módulo aunque existan respuestas que lo activaban', () => {
  const answers = { 'section-6-applies': 'No', 'section-1-22': 'Colectiva / comunitaria', 'section-2-37': 'Sí' };
  assert.equal(ethnicApplies(answers), false);
  assert.ok(ethnicFields.every(field => !applicable(6, field.id, answers)));
});

test('El switch encendido incluye todas las preguntas del módulo', () => {
  const answers = { 'section-6-applies': 'Sí' };
  assert.equal(ethnicApplies(answers), true);
  assert.equal(captureStats(capture(answers), 6).total, ethnicFields.filter(f=>applicable(6,f.id,answers)).length);
  assert.ok(validateCapture(capture(answers)).some(issue => issue.section === 6));
});

test('Las respuestas guardadas de un módulo deshabilitado no cuentan ni se validan', () => {
  const off = capture({ 'section-6-applies': 'No' });
  const saved = capture({ ...off.answers, ...Object.fromEntries(ethnicFields.map(field => [`section-6-${field.id}`, 'respuesta anterior inválida'])) });
  assert.deepEqual(captureStats(saved), captureStats(off));
  assert.equal(captureProgress(saved), captureProgress(off));
  assert.equal(captureStats(saved, 6).total, 0);
  assert.ok(validateCapture(saved).every(issue => issue.section !== 6));
  const on = capture({ ...saved.answers, 'section-6-applies': 'Sí' });
  const applicableCount=ethnicFields.filter(f=>applicable(6,f.id,on.answers)).length;
  assert.equal(captureStats(on).total - captureStats(saved).total, applicableCount);
  assert.equal(captureStats(on, 6).answered, applicableCount);
  assert.ok(validateCapture(on).some(issue => issue.section === 6));
});

test('El registro colectivo activa el módulo cuando no hay selección explícita', () => {
  assert.equal(ethnicApplies({}), false);
  assert.equal(ethnicApplies({ 'section-1-22': 'Colectiva / comunitaria' }), true);
  assert.equal(ethnicApplies({ 'section-2-37': 'Sí' }), false);
});

const identity = {
  'section-1-1': 'CC', 'section-1-2': '123456789', 'section-1-3': 'Pérez',
  'section-1-4': 'López', 'section-1-5': 'Ana', 'section-1-6': 'María',
  'section-1-7': '1990-05-12', 'section-1-8': 'Femenino',
};

test('El declarante se incluye una sola vez, con su identidad y pendiente de completar', () => {
  const empty = [];
  assert.equal(syncDeclarant({ 'section-1-5': 'Ana' }, empty), empty);
  const members = syncDeclarant(identity, empty);
  assert.equal(members.length, 1);
  assert.equal(members[0]['member-name'], 'Ana María Pérez López');
  assert.equal(members[0]['member-document'], '123456789');
  assert.equal(members[0]['member-birth'], '1990-05-12');
  assert.equal(members[0]['member-gender'], 'Femenino');
  assert.ok(memberNeedsCompletion(members[0]));
  assert.equal(syncDeclarant(identity, members), members);
});

test('La identidad del declarante se actualiza sin borrar su información del hogar', () => {
  const members = syncDeclarant(identity, []);
  members[0]['member-occupation'] = 'Docente';
  const changed = { ...identity, 'section-1-5': 'Andrea', 'section-1-2': '987654321' };
  const synced = syncDeclarant(changed, members, identity);
  assert.equal(synced.length, 1);
  assert.equal(synced[0]['member-name'], 'Andrea María Pérez López');
  assert.equal(synced[0]['member-document'], '987654321');
  assert.equal(synced[0]['member-occupation'], 'Docente');
  assert.ok(memberNeedsCompletion(synced[0]));
});

test('Un integrante existente con el mismo documento se reutiliza y conserva la revisión', () => {
  const members = [{ 'member-name': 'Ana Pérez', 'member-document-type': 'CC', 'member-document': '123456789', 'member-occupation': 'Docente' }];
  const synced = syncDeclarant(identity, members);
  assert.equal(synced.length, 1);
  assert.equal(synced[0]['member-name'], 'Ana Pérez');
  assert.equal(synced[0]['member-occupation'], 'Docente');
  assert.equal(memberNeedsCompletion(synced[0]), false);
  assert.ok(householdComplete(synced));
});

test('La ficha automática pendiente no cuenta como terminada hasta guardar su revisión', () => {
  const pending = { ...capture(identity), members: syncDeclarant(identity, []) };
  const saved = { ...pending, members: pending.members.map(m => ({ ...m, 'member-review': 'Completo' })) };
  assert.equal(householdComplete(pending.members), false);
  assert.ok(validateCapture(pending).some(issue => issue.field === 'members' && issue.message.includes('Complete los datos')));
  assert.equal(captureStats(pending, 4).answered, 0);
  assert.equal(captureStats(saved, 4).answered, 1);
  assert.ok(validateCapture(saved).every(issue => issue.field !== 'members'));
  const restored = JSON.parse(JSON.stringify(pending.members));
  assert.ok(memberNeedsCompletion(syncDeclarant(identity, restored)[0]));
});

function minimumValidCapture() {
  const answers = {};
  SECTION_SCHEMAS.forEach((section,index)=>section.groups.forEach(group=>group.fields.forEach(field=>{
    if (!field.required || field.id === '0' || field.id.startsWith('member-')) return;
    answers[`section-${index+1}-${field.id}`] = field.options?.[0] || (field.type === 'number' ? '1' : field.type === 'date' ? '1990-05-12' : 'Dato de ejemplo');
  })));
  Object.assign(answers, {'section-1-1':'CC','section-1-2':'123456789','section-2-29':'Desastres','section-2-30':'Inundación','section-4-54':'No','section-6-applies':'No'});
  return {answers, story:'Relato breve de los hechos.', selectedEvent:eventForType('Inundación'), members:[{'member-name':'Ana Pérez','member-review':'Completo'}]};
}

test('Puede terminar con todos los obligatorios y menos del 100 % general',()=>{
  const c=minimumValidCapture();
  assert.deepEqual(validateCapture(c),[]);
  const p=finishProgress(c);
  assert.equal(p.ready,true);
  assert.equal(p.pending,0);
  assert.equal(p.completed,p.total);
  assert.ok(captureProgress(c)<100);
});

test('Una respuesta obligatoria ausente o inválida se descuenta del avance para terminar',()=>{
  const c=minimumValidCapture();
  delete c.answers['section-1-4'];
  c.answers['section-1-2']='abc';
  const p=finishProgress(c);
  assert.equal(p.pending,2);
  assert.equal(p.completed,p.total-2);
  assert.equal(p.ready,false);
});

test('Los errores adicionales en opcionales bloquean el cierre sin inventar obligaciones nuevas',()=>{
  const c=minimumValidCapture();
  const base=finishProgress(c);
  c.answers['section-1-14']='correo incorrecto';
  const p=finishProgress(c);
  assert.equal(p.total,base.total);
  assert.equal(p.pending,0);
  assert.equal(p.corrections,1);
  assert.equal(p.ready,false);
});

test('El total obligatorio se adapta a unidad productiva y módulo étnico',()=>{
  const c=minimumValidCapture();
  const base=finishProgress(c);
  c.answers['section-4-54']='Sí';
  assert.ok(finishProgress(c).total>base.total);
  const productive=finishProgress(c).total;
  c.answers['section-6-applies']='Sí';
  assert.ok(finishProgress(c).total>productive);
  c.answers['section-4-54']='No';c.answers['section-6-applies']='No';
  assert.equal(finishProgress(c).total,base.total);
});

test('La revisión del hogar cuenta como un requisito aunque tenga varios errores',()=>{
  const c=minimumValidCapture();
  c.members[0]['member-review']='Pendiente';
  c.members[0]['member-document']='abc';
  const p=finishProgress(c);
  assert.equal(p.pending,1);
  assert.equal(p.corrections,0);
  assert.equal(p.ready,false);
});
