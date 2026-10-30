import {app} from './app.mjs';
import {pool} from './db.mjs';
export {app};
const host=process.env.API_HOST||'127.0.0.1';
const port=Number(process.env.API_PORT||4310);
if(process.env.NODE_ENV==='production') {
 const origins=(process.env.APP_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean);
 if(!origins.length || origins.some(value=>{
  try {const url=new URL(value);return url.protocol!=='https:' || url.origin!==value;}
  catch {return true;}
 }))throw Error('APP_ORIGIN debe contener origenes HTTPS exactos en produccion.');
}
const server=app.listen(port,host,()=>console.log(`API RUDA: http://${host}:${port}`));
let closing=false;
function shutdown() {
 if(closing)return;
 closing=true;
 const deadline=setTimeout(()=>process.exit(1),15000);
 deadline.unref();
 server.close(async error=>{
  try {await pool.end();process.exitCode=error?1:0;}
  catch {process.exitCode=1;}
  finally {clearTimeout(deadline);}
 });
}
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
