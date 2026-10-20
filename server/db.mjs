import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
try { process.loadEnvFile(resolve('.env')); } catch {}
export const pool = new pg.Pool({
 connectionString:process.env.DATABASE_URL||process.env.POSTGRES_URL||undefined,
 max:process.env.VERCEL?3:10,
 connectionTimeoutMillis:5000,
 idleTimeoutMillis:30000,
 allowExitOnIdle:true,
});
export async function transaction(work) {
 const client=await pool.connect();
 try { await client.query('BEGIN'); const result=await work(client); await client.query('COMMIT'); return result; }
 catch(error) { await client.query('ROLLBACK'); throw error; }
 finally {client.release();}
}
export const readJson = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
