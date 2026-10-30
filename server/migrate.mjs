import { pool, transaction } from './db.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const migrations=readdirSync('server/migrations').filter(name=>name.endsWith('.sql')).sort().map(name=>{
 const sql=readFileSync('server/migrations/'+name,'utf8');
 return {name,sql,checksum:createHash('sha256').update(sql).digest('hex')};
});
const freshDatabaseError=()=>Error('La base contiene una instalación diferente. Use una base vacía para instalar RUDA v8 desde cero. No se modificaron los datos existentes.');
try {
 await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(9145701)');
  const historyExists=(await c.query("SELECT to_regclass('public.schema_migration') AS history")).rows[0].history;
  const otherTables=await c.query("SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migration' LIMIT 1");
  if(!historyExists && otherTables.rowCount)throw freshDatabaseError();
  await c.query('CREATE TABLE IF NOT EXISTS public.schema_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied=(await c.query('SELECT name,checksum FROM public.schema_migration')).rows;
  if((!applied.length && otherTables.rowCount) || applied.some(row=>!migrations.some(m=>m.name===row.name)))throw freshDatabaseError();
  for(const {name,sql,checksum} of migrations) {
   const prior=applied.find(row=>row.name===name);
   if(prior) {
    if(prior.checksum!==checksum)throw Error('La migración aplicada cambió: '+name);
    continue;
   }
   await c.query(sql);
   await c.query('INSERT INTO public.schema_migration(name,checksum) VALUES($1,$2)',[name,checksum]);
  }
 });
 for(const {name} of migrations)console.log('Esquema verificado:',name);
} finally {await pool.end();}
