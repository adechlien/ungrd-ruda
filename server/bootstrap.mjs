import {departamentos} from 'colombia-territorial';
import {pool, transaction} from './db.mjs';
import {hashPassword} from './auth.mjs';
import {GUIDE_OPTIONS, GUIDE_CODES, EVENT_PRINCIPALS_BY_TYPE} from './generated/contract.mjs';

// Preparacion explicita de una instalacion nueva, sin registros de ejemplo.
const email=(process.env.RUDA_USER_EMAIL||'').trim().toLowerCase();
const name=(process.env.RUDA_USER_NAME||'').trim();
const document=(process.env.RUDA_USER_DOCUMENT||'').trim();
const password=process.env.RUDA_USER_PASSWORD||'';
try {
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||!document||password.length<12)
  throw Error('Defina RUDA_USER_EMAIL, RUDA_USER_NAME, RUDA_USER_DOCUMENT y RUDA_USER_PASSWORD (minimo 12 caracteres).');
 await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(9145702)');
  if((await c.query('SELECT 1 FROM usuario WHERE lower(correo)=$1',[email])).rowCount)
   throw Error('La cuenta ya existe. No se modifico su clave ni su informacion.');
  for(const dep of departamentos) {
   const d=await c.query('INSERT INTO departamento(codigo,nombre) VALUES($1,$2) ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_departamento',[dep.codigo_dane,dep.nombre]);
   for(const m of dep.municipios)await c.query('INSERT INTO municipio(id_departamento,codigo,nombre) VALUES($1,$2,$3) ON CONFLICT(codigo) DO NOTHING',[d.rows[0].id_departamento,m.codigo_dane,m.nombre]);
  }
  for(const group of GUIDE_OPTIONS)for(const [i,code] of GUIDE_CODES[group.id].entries())
   await c.query('INSERT INTO pregunta_guia(codigo,grupo_evento,revision_ruda,texto,orden) VALUES($1,$2,8,$3,$4) ON CONFLICT(codigo) DO NOTHING',[code,group.id,group.questions[i],i]);
  for(const [category,principals] of Object.entries(EVENT_PRINCIPALS_BY_TYPE)) {
   const type=(await c.query('INSERT INTO tipo_evento(nombre) VALUES($1) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_tipo_evento',[category])).rows[0];
   for(const principal of principals)await c.query('INSERT INTO evento_principal(id_tipo_evento,nombre) VALUES($1,$2) ON CONFLICT(id_tipo_evento,nombre) DO NOTHING',[type.id_tipo_evento,principal]);
  }
  let org=(await c.query('SELECT id_organizacion FROM organizacion ORDER BY id_organizacion LIMIT 1')).rows[0];
  if(!org)org=(await c.query("INSERT INTO organizacion(nombre,tipo) VALUES('Unidad Nacional para la Gestión del Riesgo de Desastres','UNGRD') RETURNING id_organizacion")).rows[0];
  const actor=(await c.query("INSERT INTO funcionario(id_organizacion,nombre_completo,cargo,documento) VALUES($1,$2,'Funcionario',$3) RETURNING id_funcionario",[org.id_organizacion,name,document])).rows[0];
  await c.query('INSERT INTO usuario(id_funcionario,correo,password_hash) VALUES($1,$2,$3)',[actor.id_funcionario,email,hashPassword(password)]);
 });
 console.log('Catalogos preparados y cuenta creada. No se cargaron registros de demostracion.');
} finally {await pool.end();}
