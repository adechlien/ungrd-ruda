import { pool, transaction } from './db.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
await pool.query('CREATE TABLE IF NOT EXISTS schema_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
for(const name of readdirSync('server/migrations').filter(n=>n.endsWith('.sql')).sort()) {
 const sql=readFileSync('server/migrations/'+name,'utf8');
 const helper=name==='010_ruda_v8.sql' ? readFileSync('server/migrate-v8.mjs','utf8')+readFileSync('server/v7-to-v8-keys.json','utf8') : '';
 const hash=createHash('sha256').update(sql+helper).digest('hex');
 await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(9145701)');
  const prior=await c.query('SELECT checksum FROM schema_migration WHERE name=$1',[name]);
  if(prior.rowCount) { if(prior.rows[0].checksum!==hash) throw Error('La migración aplicada cambió: '+name); return; }
  await c.query(sql);
  if(name==='010_ruda_v8.sql')await (await import('./migrate-v8.mjs')).migrateV8(c);
  await c.query('INSERT INTO schema_migration(name,checksum) VALUES($1,$2)',[name,hash]);
 });
 console.log('Migración verificada:',name);
}
await pool.end();
