import { departamentos } from 'colombia-territorial';
import { randomUUID } from 'node:crypto';
import { pool, transaction } from './db.mjs';
import { hashPassword } from './auth.mjs';
import { listForms, saveForm } from './repository.mjs';
import { SECTION_SCHEMAS, GUIDE_OPTIONS, GUIDE_CODES, eventForType, EVENT_PRINCIPALS_BY_TYPE } from './generated/contract.mjs';
import { demoSeeds } from './demo-records.mjs';
await transaction(async c=>{
 for(const dep of departamentos){
  const d=await c.query('INSERT INTO departamento(codigo,nombre) VALUES($1,$2) ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_departamento',[dep.codigo_dane,dep.nombre]);
  for(const m of dep.municipios)await c.query('INSERT INTO municipio(id_departamento,codigo,nombre) VALUES($1,$2,$3) ON CONFLICT(codigo) DO NOTHING',[d.rows[0].id_departamento,m.codigo_dane,m.nombre]);
 }
 if(!(await c.query('SELECT 1 FROM organizacion')).rowCount)await c.query("INSERT INTO organizacion(nombre,tipo) VALUES('Unidad Nacional para la Gestión del Riesgo de Desastres','UNGRD')");
 const org=(await c.query('SELECT id_organizacion FROM organizacion ORDER BY id_organizacion LIMIT 1')).rows[0].id_organizacion;
 for(const [name,email,doc] of [['Peter Parker','peter@example.com','90000001'],['Gwen Stacy','gwen@example.com','90000002']]) {
  if((await c.query('SELECT 1 FROM usuario WHERE correo=$1',[email])).rowCount)continue;
  const f=await c.query("INSERT INTO funcionario(id_organizacion,nombre_completo,cargo,documento) VALUES($1,$2,'Funcionario',$3) RETURNING id_funcionario",[org,name,doc]);
  await c.query('INSERT INTO usuario(id_funcionario,correo,password_hash) VALUES($1,$2,$3)',[f.rows[0].id_funcionario,email,hashPassword('RudaDemo2026!')]);
 }
 for(const group of GUIDE_OPTIONS)for(const [i,code] of GUIDE_CODES[group.id].entries())await c.query('INSERT INTO pregunta_guia(codigo,grupo_evento,revision_ruda,texto,orden) VALUES($1,$2,8,$3,$4) ON CONFLICT(codigo) DO NOTHING',[code,group.id,group.questions[i],i]);
 for(const [category, principals] of Object.entries(EVENT_PRINCIPALS_BY_TYPE)) {
  const type=(await c.query('INSERT INTO tipo_evento(nombre) VALUES($1) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_tipo_evento',[category])).rows[0];
  for(const name of principals)await c.query('INSERT INTO evento_principal(id_tipo_evento,nombre) VALUES($1,$2) ON CONFLICT(id_tipo_evento,nombre) DO NOTHING',[type.id_tipo_evento,name]);
 }

});
const actors=(await pool.query('SELECT f.*,u.correo FROM funcionario f JOIN usuario u USING(id_funcionario) ORDER BY f.id_funcionario')).rows;
const peter=actors.find(actor=>actor.correo==='peter@example.com');
const gwen=actors.find(actor=>actor.correo==='gwen@example.com');
const eventRows=(await pool.query(`SELECT e.id_evento_especifico AS id_evento,t.nombre AS tipo,m.nombre AS municipio,e.fecha_inicio::text AS fecha
 FROM evento_especifico e LEFT JOIN evento_principal t USING(id_evento_principal) LEFT JOIN municipio m USING(id_municipio)`)).rows;
const eventKey=(a)=>[a['section-2-30'],a['section-2-26'],a['section-2-23']].join('|');
const events=new Map(eventRows.map(event=>[[event.tipo,event.municipio,event.fecha].join('|'),String(event.id_evento)]));

async function synchronizeDemoRecords(actor,records,{onlyWhenEmpty=false,documentPrefix=''}={}) {
 const existing=await listForms(actor);
 if(onlyWhenEmpty && existing.length)return 0;
 const existingByDocument=new Map();
 for(const record of existing){const document=record.answers['section-1-2'];if(!existingByDocument.has(document))existingByDocument.set(document,[]);existingByDocument.get(document).push(record);}
 let created=0;
 for(let i=0;i<records.length;i++){
  const r=structuredClone(records[i]),a=r.answers;
  if(documentPrefix)a['section-1-2']=documentPrefix+String(i).padStart(4,'0');
  if(!documentPrefix&&i===7){a['section-1-2']=records[0].answers['section-1-2'];a['section-1-5']=records[0].answers['section-1-5'];a['section-1-3']=records[0].answers['section-1-3'];}
  const previous=existingByDocument.get(a['section-1-2'])?.shift();
  r.id=previous?.id||randomUUID();r.version=previous?.version||0;r.eventId=events.get(eventKey(a))||null;
  a['section-1-0']=r.id;a['section-1-17']='UNGRD';a['section-1-21']=new Date().toISOString().slice(0,10);a['section-2-29']='Desastres';a['section-6-applies']=i===2?'Sí':'No';
  r.selectedEvent=eventForType(a['section-2-30']);
  for(const key of Object.keys(a))if(/^(flood|coastal|landslide|drought|evacuation|fire)-/.test(key))delete a[key];
  for(const code of GUIDE_CODES[r.selectedEvent])if(r.status==='completed')a['guide-'+code]='Sí';
  r.members=r.status==='completed'?[{'member-name':a['section-1-5']+' '+a['section-1-3'],'member-document-type':'CC','member-document':a['section-1-2'],'member-birth':'1985-06-15','member-relation':'Declarante'}]:[];
  const result=await saveForm(actor,r.id,r,r.status==='completed');events.set(eventKey(a),result.eventId);if(!previous)created++;
 }
 return created;
}

const records=demoSeeds(SECTION_SCHEMAS);
const createdForPeter=await synchronizeDemoRecords(peter,records,{onlyWhenEmpty:true});
await synchronizeDemoRecords(gwen,records.slice(0,3),{onlyWhenEmpty:true,documentPrefix:'202030'});
console.log(`${createdForPeter} declaraciones ficticias nuevas. Peter tiene ${(await listForms(peter)).length} registros.`);
console.log('Cuentas demo: peter@example.com y gwen@example.com / RudaDemo2026!');
await pool.end();
