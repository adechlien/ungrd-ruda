import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SECTION_SCHEMAS,validateCapture,eventForType} from '../generated/contract.mjs';
import {demoSeeds} from '../demo-records.mjs';

test('La numeración oficial incluye cada pregunta 0–90 una sola vez',()=>{
 const numbers=SECTION_SCHEMAS.flatMap(s=>s.groups.flatMap(g=>g.fields.filter(f=>/^\d+$/.test(f.id)).map(f=>Number(f.id))));
 assert.deepEqual(numbers,[...Array(91).keys()]);
 const labels=SECTION_SCHEMAS.flatMap(s=>s.groups.flatMap(g=>g.fields.map(f=>f.label))).join('\n');
 assert.doesNotMatch(labels,/consulta previa|deudas|soberanía alimentaria|Permanece fuera|posible retornar/);
});

test('Segundo apellido obligatorio, demás nombres opcional y narración sin mínimo',()=>{
 const r=demoSeeds(SECTION_SCHEMAS)[1];r.answers['section-2-29']='Desastres';r.answers['section-6-applies']='No';r.selectedEvent=eventForType(r.answers['section-2-30']);
 r.members=[{'member-name':'Persona de prueba','member-document':'123456789','member-document-type':'CC'}];r.story='Evacuó su vivienda.';
 delete r.answers['section-1-6'];assert.deepEqual(validateCapture(r),[]);
 r.answers['section-1-4']='';assert.ok(validateCapture(r).some(i=>i.section===1&&i.field==='4'));
});
