import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {pool} from './db.mjs';

if(!['127.0.0.1','localhost','::1'].includes(process.env.PGHOST||'localhost'))throw Error('Las pruebas completas requieren PostgreSQL local; no se ejecutan sobre una base remota.');
for(const url of [process.env.DATABASE_URL,process.env.POSTGRES_URL].filter(Boolean))if(!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw Error('La URL de conexión para pruebas también debe apuntar a PostgreSQL local.');
const name='ruda_verify_'+Date.now();
const keep=process.argv.includes('--keep');
const env={...process.env,PGDATABASE:name,DATABASE_URL:'',POSTGRES_URL:''};
async function run(args){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,args,{env,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Falló: node '+args.join(' '))));
 });
}
try {
 await pool.query(`CREATE DATABASE ${name}`);
 console.log('Base aislada de verificación:',name);
 await mkdir('tmp',{recursive:true});await writeFile('tmp/test-database.json',JSON.stringify({database:name}));
 await run(['server/build-contract.cjs']);
 await run(['server/migrate.mjs']);
 await run(['server/seed.mjs']);
 // A second execution checks that migrations and seed are repeatable.
 await run(['server/migrate.mjs']);await run(['server/seed.mjs']);
 const files=['server/form-contract.test.mjs','server/statistics.test.mjs','server/v8-contract.test.mjs','server/integration.test.mjs'];
 if(process.argv.includes('--deployment'))files.push('server/deployment.test.mjs');
 await run(['--test',...files]);
} finally {
 if(!keep)await pool.query(`DROP DATABASE IF EXISTS ${name}`);
 else console.log('Base de prueba conservada temporalmente para verificar la interfaz:',name);
 await pool.end();
}
