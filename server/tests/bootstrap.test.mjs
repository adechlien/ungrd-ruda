import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pool} from '../db.mjs';
import {verifyPassword} from '../auth.mjs';

const email=`bootstrap-${randomUUID()}@example.com`;
const password='RudaVerificationOnly2026!';
let actorId;
const run=overrides=>spawnSync(process.execPath,['server/bootstrap.mjs'],{
 env:{...process.env,RUDA_USER_EMAIL:email,RUDA_USER_NAME:'Verificacion de instalacion',RUDA_USER_DOCUMENT:randomUUID(),RUDA_USER_PASSWORD:password,...overrides},encoding:'utf8',timeout:30000,
});
after(async()=>{
 try {
  await pool.query('DELETE FROM usuario WHERE correo=$1',[email]);
  if(actorId)await pool.query('DELETE FROM funcionario WHERE id_funcionario=$1',[actorId]);
 } finally {await pool.end();}
});
test('La preparacion exige credenciales explicitas y no crea una cuenta con clave vacia',async()=>{
 assert.notEqual(run({RUDA_USER_PASSWORD:''}).status,0);
 assert.equal((await pool.query('SELECT 1 FROM usuario WHERE correo=$1',[email])).rowCount,0);
});
test('La preparacion crea una cuenta sin registros y repetirla no cambia la clave',async()=>{
 const first=run();assert.equal(first.status,0,first.stderr);
 const user=(await pool.query('SELECT * FROM usuario WHERE correo=$1',[email])).rows[0];actorId=user.id_funcionario;
 assert.ok(verifyPassword(password,user.password_hash));
 assert.equal((await pool.query('SELECT 1 FROM registro WHERE id_funcionario=$1',[actorId])).rowCount,0);
 assert.ok(Number((await pool.query('SELECT count(*) AS total FROM municipio')).rows[0].total)>1000);
 assert.notEqual(run({RUDA_USER_PASSWORD:'AnotherVerification2026!'}).status,0);
 assert.equal((await pool.query('SELECT password_hash FROM usuario WHERE correo=$1',[email])).rows[0].password_hash,user.password_hash);
});
