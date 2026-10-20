import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pool } from './db.mjs';
import { SECTION_SCHEMAS, EVENT_PRINCIPALS_BY_TYPE, applicable, GUIDE_CODES, syncDeclarant } from './generated/contract.mjs';
const base='http://127.0.0.1:4311/api';let child,laura,daniel,complete;const ids=[];const documents=[];const eventIds=[];
async function request(path,method='GET',data,cookie){const response=await fetch(base+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const body=response.status===204?null:await response.json();return {status:response.status,body,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
function fresh(template){const r=structuredClone(template);r.id=randomUUID();r.version=0;r.answers['section-1-0']=r.id;ids.push(r.id);return r;}
before(async()=>{
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,API_PORT:'4311'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('API de prueba no inició.')),15000);child.stdout.on('data',d=>{if(d.toString().includes('API RUDA')){clearTimeout(timer);resolve();}});child.on('error',reject);child.once('exit',code=>reject(Error('API terminó: '+code)));});
 laura=(await request('/auth/login','POST',{email:'peter@example.com',password:'RudaDemo2026!'})).cookie;
 daniel=(await request('/auth/login','POST',{email:'gwen@example.com',password:'RudaDemo2026!'})).cookie;
 assert.ok(laura);assert.ok(daniel);
 const forms=(await request('/forms','GET',null,laura)).body;complete=forms.find(r=>r.status==='completed');assert.ok(complete);
});
after(async()=>{
 try{await pool.query('DELETE FROM registro WHERE id_registro=ANY($1::uuid[])',[ids]);
 await pool.query('DELETE FROM evento_especifico WHERE id_evento_especifico=ANY($1::bigint[])',[eventIds]);
 await pool.query('DELETE FROM persona p WHERE numero_documento=ANY($1::text[]) AND NOT EXISTS(SELECT 1 FROM registro d WHERE d.id_persona_declarante=p.id_persona)',[documents]);
 if(laura)await request('/auth/logout','POST',null,laura);if(daniel)await request('/auth/logout','POST',null,daniel);
 }finally{child?.kill();await pool.end();}
});
test('Autenticación, separación de funcionarios y eventos con varios hogares',async()=>{
 assert.equal((await request('/forms')).status,401);
 const a=await request('/forms','GET',null,laura),b=await request('/forms','GET',null,daniel);
 assert.equal(a.status,200);assert.equal(b.status,200);assert.ok(a.body.length);assert.ok(b.body.length);
 assert.ok(a.body.every(r=>!b.body.some(o=>o.id===r.id)));
 assert.equal((await request('/forms/'+a.body[0].id,'PUT',a.body[0],daniel)).status,404);
 const events=await request('/events','GET',null,laura);assert.equal(events.status,200);assert.ok(events.body.some(e=>e.households>1));
 assert.equal(events.body.reduce((total,event)=>total+event.declarations,0),a.body.filter(record=>record.status==='completed').length);
});
test('Borrador solo con documento; identificador estable y primera sección pendiente',async()=>{
 const id=randomUUID();ids.push(id);const doc=String(randomInt(700000000,799999999));documents.push(doc);
 const payload={revisionRuda:8,answers:{},story:'',selectedEvent:'other',members:[],eventId:null,version:0};
 assert.equal((await request('/forms/'+id,'PUT',payload,laura)).status,422);
 payload.answers['section-1-2']=doc;
 let saved=await request('/forms/'+id,'PUT',payload,laura);assert.equal(saved.status,200);assert.equal(saved.body.status,'pending');assert.equal(saved.body.activeSection,1);assert.equal(saved.body.id,id);
 assert.equal((await pool.query('SELECT 1 FROM desplazamiento WHERE id_registro=$1',[id])).rowCount,0);
 assert.equal((await request('/forms/'+id+'/finish','POST',saved.body,laura)).status,422);
 const forms=(await request('/forms','GET',null,laura)).body;assert.equal(forms.find(r=>r.id===id).version,1);
 for(const [key,value] of Object.entries(complete.answers))if(key.startsWith('section-1-'))saved.body.answers[key]=value;
 saved.body.answers['section-1-2']=doc;
 const sectionTwo=await request('/forms/'+id,'PUT',saved.body,laura);assert.equal(sectionTwo.status,200);assert.equal(sectionTwo.body.activeSection,2);
});

test('Declarante automático: persiste pendiente y exige revisar la ficha antes de terminar',async()=>{
 const r=fresh(complete);r.answers['section-1-2']=String(randomInt(700000000,799999999));documents.push(r.answers['section-1-2']);
 r.members=syncDeclarant(r.answers,[]);
 const saved=await request('/forms/'+r.id,'PUT',r,laura);assert.equal(saved.status,200);
 assert.equal(saved.body.members[0]['member-review'],'Pendiente');
 const restored=(await request('/forms','GET',null,laura)).body.find(record=>record.id===r.id);
 assert.equal(restored.members[0]['member-review'],'Pendiente');
 const blocked=await request('/forms/'+r.id+'/finish','POST',saved.body,laura);
 assert.equal(blocked.status,422);assert.ok(blocked.body.issues.some(issue=>issue.section===4&&issue.field==='members'));
 saved.body.members[0]['member-review']='Completo';
 const finished=await request('/forms/'+r.id+'/finish','POST',saved.body,laura);
 assert.equal(finished.status,200);assert.equal(finished.body.status,'completed');
});

test('El evento conserva su categoría y actualiza sus detalles mientras no esté compartido',async()=>{
 const r=fresh(complete);r.eventId=null;
 const category=SECTION_SCHEMAS[1].groups.flatMap(g=>g.fields).find(f=>f.id==='29').options.find(v=>v!=='Desastres');
 r.answers['section-2-29']=category;r.answers['section-2-30']=EVENT_PRINCIPALS_BY_TYPE[category][0];
 const saved=await request('/forms/'+r.id,'PUT',r,laura);assert.equal(saved.status,200);eventIds.push(saved.body.eventId);
 assert.equal((await request('/events','GET',null,laura)).body.some(e=>e.id===saved.body.eventId),false);
 const event=(await pool.query(`SELECT e.id_evento_especifico AS id,cat.nombre AS categoria,e.fecha_inicio::text AS fecha
  FROM evento_especifico e JOIN evento_principal tipo USING(id_evento_principal) JOIN tipo_evento cat USING(id_tipo_evento)
  WHERE e.id_evento_especifico=$1`,[saved.body.eventId])).rows[0];assert.equal(event.categoria,category);
 saved.body.answers['section-2-23']='2026-05-02';
 assert.equal((await request('/forms/'+r.id,'PUT',saved.body,laura)).status,200);
 assert.equal((await pool.query('SELECT fecha_inicio::text AS fecha FROM evento_especifico WHERE id_evento_especifico=$1',[event.id])).rows[0].fecha,'2026-05-02');
});
test('Terminar exige cada campo obligatorio aplicable; fallo no escribe y completar sí',async()=>{
 const r=fresh(complete);r.status='pending';r.answers['section-1-2']=String(randomInt(700000000,799999999));documents.push(r.answers['section-1-2']);
 const saved=await request('/forms/'+r.id,'PUT',r,laura);assert.equal(saved.status,200);
 for(const [si,section] of SECTION_SCHEMAS.entries())for(const group of section.groups)for(const field of group.fields){
  if(!field.required||field.id==='0'||['19','20'].includes(field.id)||field.id.startsWith('member-')||!applicable(si+1,field.id,r.answers))continue;
  const invalid=structuredClone(saved.body);invalid.answers[`section-${si+1}-${field.id}`]='';
  const result=await request('/forms/'+r.id+'/finish','POST',invalid,laura);assert.equal(result.status,422,'Debe rechazar '+field.id);
 }
 const noStory=structuredClone(saved.body);noStory.story='';assert.equal((await request('/forms/'+r.id+'/finish','POST',noStory,laura)).status,422);
 const noMembers=structuredClone(saved.body);noMembers.members=[];assert.equal((await request('/forms/'+r.id+'/finish','POST',noMembers,laura)).status,422);
 
 const finished=await request('/forms/'+r.id+'/finish','POST',saved.body,laura);assert.equal(finished.status,200);assert.equal(finished.body.status,'completed');assert.ok(finished.body.finishedAt);
 const audit=await request('/forms/'+r.id+'/history','GET',null,laura);assert.equal(audit.body.length,2);
 const stale=await request('/forms/'+r.id,'PUT',saved.body,laura);assert.equal(stale.status,409);
});
test('Editar una declaración no cambia otra del mismo declarante ni el evento compartido',async()=>{
 const doc=String(randomInt(700000000,799999999));documents.push(doc);
 const one=fresh(complete),two=fresh(complete);one.answers['section-1-2']=doc;two.answers['section-1-2']=doc;
 const first=(await request('/forms/'+one.id,'PUT',one,laura)).body;
 const second=(await request('/forms/'+two.id,'PUT',two,laura)).body;
 const persons=await pool.query('SELECT DISTINCT id_persona_declarante FROM registro WHERE id_registro=ANY($1::uuid[])',[[one.id,two.id]]);assert.equal(persons.rowCount,1);
 const eventBefore=(await pool.query('SELECT * FROM evento_especifico WHERE id_evento_especifico=$1',[first.eventId])).rows[0];
 first.answers['section-1-5']='Nombre corregido';first.answers['section-2-28']='Dirección corregida de una sola declaración';
 assert.equal((await request('/forms/'+one.id,'PUT',first,laura)).status,200);
 const untouched=(await request('/forms','GET',null,laura)).body.find(r=>r.id===two.id);assert.deepEqual(untouched,second);
 assert.deepEqual((await pool.query('SELECT * FROM evento_especifico WHERE id_evento_especifico=$1',[first.eventId])).rows[0],eventBefore);
});
test('Reglas v8: narración sin mínimo, guías opcionales y certificación obligatoria',async()=>{
 const r=fresh(complete);r.story='La familia evacuó su vivienda.';
 r.answers['section-4-54']='No';r.answers['section-6-applies']='No';r.answers['section-1-22']='Individual';
 for(const key of Object.keys(r.answers))if(key.startsWith('guide-'))delete r.answers[key];
 const result=await request('/forms/'+r.id+'/finish','POST',r,laura);assert.equal(result.status,200);
 const ds=(await pool.query('SELECT id_desplazamiento FROM desplazamiento WHERE id_registro=$1',[r.id])).rows[0];
 const rows=await pool.query('SELECT count(*)::int AS n FROM miembro_hogar m JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1',[r.id]);assert.equal(rows.rows[0].n,r.members.length);
 const c=await pool.connect();try{await c.query('BEGIN');await assert.rejects(c.query('INSERT INTO certificacion_desplazamiento(id_desplazamiento) VALUES($1)',[ds.id_desplazamiento]),e=>e.code==='23505');}finally{await c.query('ROLLBACK');c.release();}
 for(const field of ['35','36','37']){const invalid=structuredClone(result.body);invalid.answers['section-2-'+field]='';assert.equal((await request('/forms/'+r.id+'/finish','POST',invalid,laura)).status,422);}
});

test('No admite miembros duplicados, revisiones viejas ni valores fuera del catálogo',async()=>{
 const r=fresh(complete);r.members.push(structuredClone(r.members[0]));assert.equal((await request('/forms/'+r.id+'/finish','POST',r,laura)).status,422);
 r.members.pop();r.answers['section-2-47']='Tal vez';assert.equal((await request('/forms/'+r.id+'/finish','POST',r,laura)).status,422);
 r.revisionRuda=7;assert.equal((await request('/forms/'+r.id,'PUT',r,laura)).status,409);
});

test('Acta: carga binaria, descarga exacta, aislamiento y eliminación',async()=>{
 const r=fresh(complete);r.answers['section-1-2']=String(randomInt(700000000,799999999));documents.push(r.answers['section-1-2']);
 assert.equal((await request('/forms/'+r.id,'PUT',r,laura)).status,200);
 const url=base+'/forms/'+r.id+'/acta';
 const bytes=Buffer.from('%PDF-1.4\nActa ficticia de prueba\n%%EOF');
 let response=await fetch(url+'?nombre=Acta.pdf',{method:'PUT',headers:{Cookie:laura,'Content-Type':'application/octet-stream'},body:bytes});
 assert.equal(response.status,200);assert.equal((await response.json()).bytes,bytes.length);
 response=await fetch(url,{headers:{Cookie:laura}});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
 assert.equal((await fetch(url,{headers:{Cookie:daniel}})).status,404);
 assert.equal((await fetch(url,{headers:{}})).status,401);
 assert.equal((await fetch(url+'?nombre=Mal.pdf',{method:'PUT',headers:{Cookie:laura,'Content-Type':'application/octet-stream'},body:'no es PDF'})).status,422);
 const saved=(await request('/forms','GET',null,laura)).body.find(item=>item.id===r.id);assert.equal(saved.acta.nombre,'Acta.pdf');
 assert.equal((await request('/forms/'+r.id,'PUT',saved,laura)).body.acta.nombre,'Acta.pdf');
 assert.equal((await request('/forms/'+r.id+'/acta','DELETE',null,daniel)).status,404);
 assert.equal((await request('/forms/'+r.id+'/acta','DELETE',null,laura)).status,204);
 assert.equal((await fetch(url,{headers:{Cookie:laura}})).status,404);
});

test('Persiste varios animales y bienes con su valor propio, incluidos los decimales',async()=>{
 const r=fresh(complete);r.answers['section-4-animal-species']='Perros';r.answers['section-4-animal-count']='2';
 r.answers['section-4-animal-species--2']='Gatos';r.answers['section-4-animal-count--2']='3';
 r.answers['section-5-property-type--2']='Parcela';r.answers['section-5-property-identifier--2']='Lote 2';r.answers['section-5-property-value--2']='12345.67';
 const result=await request('/forms/'+r.id,'PUT',r,laura);assert.equal(result.status,200);
 const animals=(await pool.query('SELECT especie,cantidad FROM animal_domestico a JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1 ORDER BY especie',[r.id])).rows;
 assert.deepEqual(animals,[{especie:'Gatos',cantidad:3},{especie:'Perros',cantidad:2}]);
 const parcel=(await pool.query("SELECT valor_aproximado FROM bien_inmueble b JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1 AND identificador='Lote 2'",[r.id])).rows[0];assert.equal(parcel.valor_aproximado,'12345.67');
 const restored=(await request('/forms','GET',null,laura)).body.find(item=>item.id===r.id);assert.equal(restored.answers['section-4-animal-count--2'],'3');
 r.answers['section-4-animal-count--2']='2.5';assert.equal((await request('/forms/'+r.id+'/finish','POST',r,laura)).status,422);
});

test('Guardados concurrentes: solo una escritura gana la misma versión',async()=>{
 const r=fresh(complete);const first=(await request('/forms/'+r.id,'PUT',r,laura)).body;
 const [one,two]=await Promise.all([request('/forms/'+r.id,'PUT',{...first,story:'Cambio uno'},laura),request('/forms/'+r.id,'PUT',{...first,story:'Cambio dos'},laura)]);
 assert.deepEqual([one.status,two.status].sort(),[200,409]);
 const history=(await request('/forms/'+r.id+'/history','GET',null,laura)).body;assert.equal(history.length,2);
 assert.equal((await request('/forms/'+r.id+'/history','GET',null,daniel)).status,404);
});

test('Un error en las dependencias revierte registro, historial e integrantes',async()=>{
 const r=fresh(complete);const saved=(await request('/forms/'+r.id,'PUT',r,laura)).body;
 const invalid=structuredClone(saved);invalid.story='Este cambio se debe revertir';invalid.members.push(structuredClone(invalid.members[0]));
 assert.equal((await request('/forms/'+r.id,'PUT',invalid,laura)).status,422);
 const restored=(await request('/forms','GET',null,laura)).body.find(item=>item.id===r.id);assert.deepEqual(restored,saved);
 assert.equal((await request('/forms/'+r.id+'/history','GET',null,laura)).body.length,1);
});

test('Módulo étnico: datos normalizados, seguimiento y desactivación',async()=>{
 const r=fresh(complete);Object.assign(r.answers,{'section-6-applies':'Sí','section-6-77':'Comunidad de prueba','section-6-78':'Resguardo indígena','section-6-80':'Sí','section-6-81':'Autoridad de prueba','section-6-82':'Vínculo cultural','section-6-83':'No','section-6-84':'3','section-6-85':'Sí','section-6-86':'No','section-6-87':'No','section-6-88':'Personería','section-6-89':'Sí','section-6-interpreter-language':'Lengua de prueba','section-6-90':'Sí','section-6-ethnic-file-number':'EXP-PRUEBA'});
 const result=await request('/forms/'+r.id+'/finish','POST',r,laura);assert.equal(result.status,200);
 const module=(await pool.query('SELECT c.nombre,m.municipio_pdet,s.lengua_interprete,s.numero_expediente FROM hogar h JOIN modulo_etnico m USING(id_hogar) JOIN comunidad c USING(id_comunidad) JOIN seguimiento_etnico s USING(id_modulo_etnico) WHERE h.id_registro=$1',[r.id])).rows[0];
 assert.deepEqual(module,{nombre:'Comunidad de prueba',municipio_pdet:true,lengua_interprete:'Lengua de prueba',numero_expediente:'EXP-PRUEBA'});
 result.body.answers['section-6-applies']='No';assert.equal((await request('/forms/'+r.id,'PUT',result.body,laura)).status,200);
 assert.equal((await pool.query('SELECT 1 FROM modulo_etnico m JOIN hogar h USING(id_hogar) WHERE h.id_registro=$1',[r.id])).rowCount,0);
});

test('Una geografía inválida devuelve el registro a borrador y no se certifica como completo',async()=>{
 const r=fresh(complete);const finished=await request('/forms/'+r.id+'/finish','POST',r,laura);assert.equal(finished.status,200);
 finished.body.answers['section-2-42']='Municipio inexistente';
 const saved=await request('/forms/'+r.id,'PUT',finished.body,laura);assert.equal(saved.status,200);assert.equal(saved.body.status,'pending');assert.equal(saved.body.finishedAt,null);
 assert.equal((await request('/forms/'+r.id+'/finish','POST',saved.body,laura)).status,422);
});

test('Fechas imposibles, números fuera de rango y eventos inválidos no generan error 500',async()=>{
 const r=fresh(complete);r.members[0]['member-birth']='2026-02-31';assert.equal((await request('/forms/'+r.id+'/finish','POST',r,laura)).status,422);
 r.members[0]['member-birth']='1985-06-15';r.answers['section-5-70']='1e30';assert.equal((await request('/forms/'+r.id+'/finish','POST',r,laura)).status,422);
 const draft=await request('/forms/'+r.id,'PUT',r,laura);assert.equal(draft.status,200);
 draft.body.eventId='999999999999999999999999';assert.equal((await request('/forms/'+r.id,'PUT',draft.body,laura)).status,400);
});

test('Actas: 4 MB aceptados y un byte adicional rechazado antes de guardar',async()=>{
 const r=fresh(complete);assert.equal((await request('/forms/'+r.id,'PUT',r,laura)).status,200);
 const url=base+'/forms/'+r.id+'/acta?nombre=Limite.pdf';
 const bytes=Buffer.alloc(4*1024*1024,32);bytes.write('%PDF-1.4\n');
 let response=await fetch(url,{method:'PUT',headers:{Cookie:laura,'Content-Type':'application/octet-stream'},body:bytes});assert.equal(response.status,200);
 assert.equal((await response.json()).bytes,bytes.length);
 response=await fetch(url,{method:'PUT',headers:{Cookie:laura,'Content-Type':'application/octet-stream'},body:Buffer.concat([bytes,Buffer.from('x')])});assert.equal(response.status,413);assert.match((await response.json()).message,/4 MB/);
 const stored=(await pool.query('SELECT octet_length(contenido) AS n FROM archivo_registro WHERE id_registro=$1',[r.id])).rows[0];assert.equal(stored.n,bytes.length);
});
