import express from 'express';
import { randomBytes } from 'node:crypto';
import { pool } from './db.mjs';
import { hashToken, verifyPassword } from './auth.mjs';
import { ApiError, listForms, listEvents, saveForm } from './repository.mjs';
import { saveActa, getActa, deleteActa } from './acta.mjs';
export const app=express();
app.disable('x-powered-by');
if(process.env.VERCEL)app.set('trust proxy',1);
const allowedOrigins=new Set([
 'http://localhost:4305','http://127.0.0.1:4305','http://localhost:4310','http://127.0.0.1:4310',
 'http://localhost:'+Number(process.env.API_PORT||4310),'http://127.0.0.1:'+Number(process.env.API_PORT||4310),
 ...(process.env.APP_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean),
 ...[process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL].filter(Boolean).map(host=>'https://'+host),
]);
app.use(express.json({limit:'1mb'}));
app.use((req,res,next)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin) {
  let origin;try{origin=new URL(req.headers.origin);}catch{return res.status(403).json({message:'Origen no permitido.'});}
  if(!allowedOrigins.has(origin.origin)) return res.status(403).json({message:'Origen no permitido.'});
 }
 next();
});
const publicActor=r=>({id:r.id_usuario,funcionarioId:r.id_funcionario,name:r.nombre_completo,email:r.correo,role:r.rol,organization:r.organizacion,organizationType:r.tipo,document:r.documento});
const actorSql=`SELECT u.*,f.id_organizacion,f.nombre_completo,f.documento,o.nombre AS organizacion,o.tipo FROM usuario u JOIN funcionario f USING(id_funcionario) JOIN organizacion o USING(id_organizacion)`;
const attempts=new Map();
app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',database:'PostgreSQL'});});
app.post('/api/auth/login',async(req,res)=>{
 const key=req.ip,now=Date.now();let rate=attempts.get(key);if(!rate||now-rate.start>60000)rate={start:now,count:0};rate.count++;attempts.set(key,rate);
 if(rate.count>10)throw new ApiError(429,'Demasiados intentos. Espere un minuto.');
 const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string'||password.length>200)throw new ApiError(400,'Ingrese correo y contraseña.');
 const r=await pool.query(actorSql+' WHERE lower(u.correo)=lower($1) AND u.activo',[email.trim()]);
 if(!r.rowCount || !verifyPassword(password,r.rows[0].password_hash))throw new ApiError(401,'Correo o contraseña incorrectos.');
 const token=randomBytes(32).toString('hex');
 await pool.query('INSERT INTO sesion(token_hash,id_usuario,expira_en) VALUES($1,$2,now()+interval \'8 hours\')',[hashToken(token),r.rows[0].id_usuario]);
 res.cookie('ruda_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production'||Boolean(process.env.VERCEL),maxAge:8*3600000,path:'/api'});res.json(publicActor(r.rows[0]));
});
app.use('/api',async(req,res,next)=>{
 const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ruda_session='))?.split('=')[1];
 if(!token)throw new ApiError(401,'Inicie sesión para continuar.');
 const r=await pool.query(actorSql+' JOIN sesion s USING(id_usuario) WHERE s.token_hash=$1 AND s.expira_en>now() AND u.activo',[hashToken(token)]);
 if(!r.rowCount)throw new ApiError(401,'La sesión expiró. Inicie sesión nuevamente.');req.actor=r.rows[0];req.token=token;next();
});
app.get('/api/auth/me',(req,res)=>res.json(publicActor(req.actor)));
app.post('/api/auth/logout',async(req,res)=>{await pool.query('DELETE FROM sesion WHERE token_hash=$1',[hashToken(req.token)]);res.clearCookie('ruda_session',{path:'/api'});res.sendStatus(204);});
app.get('/api/forms',async(req,res)=>res.json(await listForms(req.actor)));
app.get('/api/events',async(req,res)=>res.json(await listEvents(req.actor)));
app.put('/api/forms/:id',async(req,res)=>res.json(await saveForm(req.actor,req.params.id,req.body,false)));
app.post('/api/forms/:id/finish',async(req,res)=>res.json(await saveForm(req.actor,req.params.id,req.body,true)));
app.put('/api/forms/:id/acta',express.raw({type:'application/octet-stream',limit:'4mb'}),async(req,res)=>res.json(await saveActa(req.actor,req.params.id,req.query.nombre,req.body)));
app.get('/api/forms/:id/acta',async(req,res)=>{
 const file=await getActa(req.actor,req.params.id);
 res.setHeader('Content-Type',file.mime);
 res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.nombre));
 res.send(file.contenido);
});
app.delete('/api/forms/:id/acta',async(req,res)=>{await deleteActa(req.actor,req.params.id);res.sendStatus(204);});
app.get('/api/forms/:id/history',async(req,res)=>{
 const own=await pool.query('SELECT 1 FROM registro WHERE id_registro=$1 AND id_funcionario=$2',[req.params.id,req.actor.id_funcionario]);if(!own.rowCount)throw new ApiError(404,'Declaración no encontrada.');
 const r=await pool.query('SELECT version_registro AS version,estado,creado_en FROM auditoria_registro WHERE id_registro=$1 ORDER BY version_registro DESC',[req.params.id]);res.json(r.rows);
});
app.use('/api',(req,res)=>res.status(404).json({message:'Ruta no encontrada.'}));
app.use((error,req,res,next)=>{
 const status=error.status||(['23505','23514','23503','22P02'].includes(error.code)?422:500);
 if(status===500)console.error('Error de API:',error.message);
 res.status(status).json({message:error.type==='entity.too.large'?'El archivo o la solicitud supera el tamaño permitido (actas: 4 MB).':status===500?'No se pudo completar la operación.':error.status?error.message:'Los datos no cumplen las restricciones del modelo.',issues:error.issues||[]});
});

export default app;
