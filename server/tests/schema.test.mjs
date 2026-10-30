import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pool} from '../db.mjs';

before(async()=>{
 const name=(await pool.query('SELECT current_database() AS name')).rows[0].name;
 assert.match(name,/^ruda_verify_\d+$/,'Estas pruebas solo se ejecutan en la base temporal del verificador.');
});
after(()=>pool.end());
const migrate=()=>spawnSync(process.execPath,['server/migrate.mjs'],{env:process.env,encoding:'utf8',timeout:30000});
const history=async()=>(await pool.query('SELECT name,checksum,applied_at FROM schema_migration ORDER BY name')).rows;

test('La instalación vacía contiene únicamente el esquema activo v8, sin cuentas ni registros',async()=>{
 const names=new Set((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(row=>row.tablename));
 for(const name of ['registro','registro_declarante','evento_principal','evento_especifico','archivo_registro','modulo_etnico','observacion_registro'])assert.ok(names.has(name),name);
 for(const name of ['declaracion','categoria_evento','evento','narracion_hechos','certificacion_evento','auditoria_declaracion'])assert.ok(!names.has(name),name);
 assert.equal((await pool.query("SELECT 1 FROM pg_namespace WHERE nspname='ruda_legacy_v7'")).rowCount,0);
 assert.equal((await pool.query('SELECT 1 FROM usuario UNION ALL SELECT 1 FROM registro')).rowCount,0);
 const applied=await history();assert.deepEqual(applied.map(row=>row.name),['001_initial_v8.sql']);
 assert.match(applied[0].checksum,/^[a-f0-9]{64}$/);
});

test('Repetir la instalación conserva su historial y no carga ejemplos',async()=>{
 const prior=await history();const result=migrate();assert.equal(result.status,0,result.stderr);
 assert.deepEqual(await history(),prior);
 assert.equal((await pool.query('SELECT 1 FROM usuario UNION ALL SELECT 1 FROM registro')).rowCount,0);
});

test('Un historial de otra instalación se rechaza sin modificar sus entradas',async()=>{
 const name='000_different_installation.sql';
 await pool.query('INSERT INTO schema_migration(name,checksum) VALUES($1,$2)',[name,'0'.repeat(64)]);
 try {
  const prior=await history();const result=migrate();assert.notEqual(result.status,0);assert.match(result.stderr,/base vacía/);
  assert.deepEqual(await history(),prior);
 } finally {await pool.query('DELETE FROM schema_migration WHERE name=$1',[name]);}
});

test('Una discrepancia de checksum se rechaza sin actualizar el historial',async()=>{
 const [initial]=await history();
 await pool.query('UPDATE schema_migration SET checksum=$1 WHERE name=$2',['0'.repeat(64),initial.name]);
 try {
  const result=migrate();assert.notEqual(result.status,0);assert.match(result.stderr,/migración aplicada cambió/);
  assert.equal((await history())[0].checksum,'0'.repeat(64));
 } finally {await pool.query('UPDATE schema_migration SET checksum=$1 WHERE name=$2',[initial.checksum,initial.name]);}
});

test('Una base con tablas y sin historial se rechaza sin crear metadatos',async()=>{
 await pool.query('ALTER TABLE schema_migration RENAME TO saved_migration_history');
 try {
  const result=migrate();assert.notEqual(result.status,0);assert.match(result.stderr,/base vacía/);
  assert.equal((await pool.query("SELECT to_regclass('public.schema_migration') AS history")).rows[0].history,null);
  assert.equal((await pool.query('SELECT 1 FROM saved_migration_history')).rowCount,1);
 } finally {await pool.query('ALTER TABLE saved_migration_history RENAME TO schema_migration');}
});
