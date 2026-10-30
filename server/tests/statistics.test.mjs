import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildStatistics} from '../../src/app/dashboard/statistics.ts';
import {EMPTY_STATISTICS} from '../../src/app/core/models/statistics.ts';

test('Presenta totales y porcentajes sobre cantidades, sin registros completos',()=>{
 const summary=structuredClone(EMPTY_STATISTICS);
 summary.totals={events:2,displacements:4,declarants:3};
 summary.breakdowns.sex=[{label:'Masculino',count:1},{label:'Femenino',count:2}];
 const result=buildStatistics(summary);
 assert.deepEqual(result.metrics.map(m=>m.value),[2,4,3]);
 const chart=result.charts[1];assert.equal(chart.total,3);assert.equal(chart.rows[0].label,'Femenino');
 assert.ok(Math.abs(chart.rows[0].percent-200/3)<1e-10);
 assert.ok(Math.abs(chart.rows.reduce((n,r)=>n+r.percent,0)-100)<1e-10);
 assert.ok(Math.abs(chart.rows.at(-1).end-100)<1e-10);assert.match(chart.pie,/conic-gradient/);
 assert.deepEqual(summary.breakdowns.sex,[{label:'Masculino',count:1},{label:'Femenino',count:2}]);
});

test('Conserva categorias, cantidades y grupos recibidos para cada grafica',()=>{
 const summary=structuredClone(EMPTY_STATISTICS);
 for(const key of Object.keys(summary.breakdowns))summary.breakdowns[key]=[{label:key,count:2},{label:'Sin información',count:1}];
 const result=buildStatistics(summary);
 assert.deepEqual(result.charts.map(chart=>chart.rows[0].label),Object.keys(summary.breakdowns));
 assert.ok(result.charts.every(chart=>chart.total===3&&chart.max===2&&chart.rows[1].label==='Sin información'));
 assert.deepEqual(result.charts.map(chart=>chart.group),['overview','overview','overview','displacement','current','current','displacement','displacement']);
});

test('Sin datos no inventa porcentajes ni categorias',()=>{
 const result=buildStatistics(EMPTY_STATISTICS);
 assert.ok(result.metrics.every(m=>m.value===0));
 assert.ok(result.charts.every(c=>c.total===0&&c.rows.length===0&&c.pie==='none'));
});
