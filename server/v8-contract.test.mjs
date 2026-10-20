import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SECTION_SCHEMAS,validateCapture,eventForType} from './generated/contract.mjs';
import {convertV7Capture} from './migrate-v8.mjs';
import {demoSeeds} from './demo-records.mjs';

test('La numeración oficial incluye cada pregunta 0–90 una sola vez',()=>{
 const numbers=SECTION_SCHEMAS.flatMap(s=>s.groups.flatMap(g=>g.fields.filter(f=>/^\d+$/.test(f.id)).map(f=>Number(f.id))));
 assert.deepEqual(numbers,[...Array(91).keys()]);
 const labels=SECTION_SCHEMAS.flatMap(s=>s.groups.flatMap(g=>g.fields.map(f=>f.label))).join('\n');
 assert.doesNotMatch(labels,/consulta previa|deudas|soberanía alimentaria|Permanece fuera|posible retornar/);
});

test('La conversión no confunde las preguntas antiguas con los nuevos números',()=>{
 const converted=convertV7Capture({answers:{'section-2-37':'Sí','section-2-41':'2026-04-01','section-2-47':'IDEAM','section-2-53':'2026-04-02','section-2-61':'No','section-4-70':'No','section-5-89':'Sí','section-6-107':'Sí','section-6-108':'No'},story:'Observación histórica',members:[]});
 assert.equal(converted.revisionRuda,8);assert.equal(converted.answers['section-2-35'],'2026-04-01');assert.equal(converted.answers['section-2-37'],'IDEAM');
 assert.equal(converted.answers['section-2-39'],'2026-04-02');assert.equal(converted.answers['section-4-54'],'No');assert.equal(converted.answers['section-6-89'],'No');
 assert.equal(converted.answers['section-6-applies'],'Sí');assert.equal(converted.answers['section-2-61'],undefined);assert.equal(converted.answers['section-5-89'],undefined);
});

test('Segundo apellido obligatorio, demás nombres opcional y narración sin mínimo',()=>{
 const r=demoSeeds(SECTION_SCHEMAS)[1];r.answers['section-2-29']='Desastres';r.answers['section-6-applies']='No';r.selectedEvent=eventForType(r.answers['section-2-30']);
 r.members=[{'member-name':'Persona de prueba','member-document':'123456789','member-document-type':'CC'}];r.story='Evacuó su vivienda.';
 delete r.answers['section-1-6'];assert.deepEqual(validateCapture(r),[]);
 r.answers['section-1-4']='';assert.ok(validateCapture(r).some(i=>i.section===1&&i.field==='4'));
});
