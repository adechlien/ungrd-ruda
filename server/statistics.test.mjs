import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildStatistics} from '../src/app/dashboard/statistics.ts';
const record=(id,doc,answers={},eventId='1',savedAt='2026-09-10')=>({id,eventId,savedAt,answers:{'section-1-1':'CC','section-1-2':doc,...answers}});
test('Cuenta eventos y personas sin duplicarlos por declaración',()=>{
 const result=buildStatistics([record('a','123456',{'section-1-8':'Femenino'},'1','2026-09-01'),record('b','123456',{'section-1-8':'Otro'},'2'),record('c','999999',{},'1')],[{id:'1',tipo:'Inundación'},{id:'2',tipo:'Sequía'},{id:'3',tipo:'Incendio'}]);
 assert.deepEqual(result.metrics.map(m=>m.value),[2,0,2]);
 const rows=result.charts[1].rows;assert.equal(rows.find(r=>r.label==='Otro').count,1);assert.equal(rows.find(r=>r.label==='Sin información').count,1);assert.equal(rows.reduce((n,r)=>n+r.percent,0),100);
});
test('Desplazamientos requieren fecha de salida; no usa creación ni estado del formulario',()=>{
 const result=buildStatistics([record('a','123456',{'section-2-39':'2026-05-01','section-2-42':'Medellín','section-2-41':'Antioquia','section-2-52':'Persistencia del riesgo'}),record('b','999999',{'section-2-39':'incorrecta'})],[]);
 assert.equal(result.metrics[1].value,1);assert.equal(result.charts[2].rows[0].label,'Medellín · Antioquia');assert.equal(result.charts[5].rows[0].label,'Persistencia del riesgo');assert.equal(result.charts[4].rows[0].label,'Sin información');
});
test('Sin datos no inventa porcentajes ni categorías',()=>{
 const result=buildStatistics([],[]);assert.ok(result.metrics.every(m=>m.value===0));assert.ok(result.charts.every(c=>c.total===0&&c.rows.length===0&&c.pie==='none'));
});
