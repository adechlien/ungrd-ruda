import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';

const base='http://127.0.0.1:4313/api';let child,cookie;
before(async()=>{
 const code="import app from './api/index.mjs'; import {createServer} from 'node:http'; createServer(app).listen(4313,'127.0.0.1',()=>console.log('HANDLER_READY'));";
 child=spawn(process.execPath,['--input-type=module','-e',code],{env:{...process.env,API_PORT:'4313',NODE_ENV:'production',VERCEL:'1',APP_ORIGIN:'https://ruda-demo.example',VERCEL_URL:'ruda-preview.vercel.app'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('El adaptador no inició')),15000);child.stdout.on('data',data=>{if(data.toString().includes('HANDLER_READY')){clearTimeout(timer);resolve();}});child.once('error',reject);child.once('exit',code=>reject(Error('El adaptador terminó: '+code)));});
});
after(async()=>{try{if(cookie)await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'https://ruda-demo.example'}});}finally{child?.kill();}});
const login=origin=>fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'peter@example.com',password:'RudaDemo2026!'})});

test('El adaptador de Vercel sirve las rutas /api sin iniciar otro puerto al importarlo',async()=>{
 const health=await fetch(base+'/health');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
 const r=await login('https://ruda-demo.example');assert.equal(r.status,200);const header=r.headers.get('set-cookie');
 assert.match(header,/HttpOnly/i);assert.match(header,/Secure/i);assert.match(header,/SameSite=Strict/i);cookie=header.split(';')[0];
 const forms=await fetch(base+'/forms',{headers:{Cookie:cookie}});assert.equal(forms.status,200);assert.ok((await forms.json()).every(r=>r.revisionRuda===8));
});
test('El origen de preview exacto funciona y un origen ajeno se rechaza',async()=>{
 const preview=await login('https://ruda-preview.vercel.app');assert.equal(preview.status,200);
 await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:preview.headers.get('set-cookie').split(';')[0],Origin:'https://ruda-preview.vercel.app'}});
 assert.equal((await login('https://ruda-preview.vercel.app.attacker.example')).status,403);
 assert.equal((await login('null')).status,403);
});
test('Configuración: frontend compilado, contrato de API y rutas de función presentes',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.equal(config.outputDirectory,'dist/ruda-web/browser');assert.equal(config.buildCommand,'npm run build:vercel');
 assert.equal(config.functions['api/index.mjs'].includeFiles,'server/**');
 assert.deepEqual(config.rewrites[0],{source:'/api/:path*',destination:'/api'});
 assert.ok(existsSync(config.outputDirectory+'/index.html'));assert.ok(existsSync('server/generated/contract.mjs'));
 const index=readFileSync(config.outputDirectory+'/index.html','utf8');assert.match(index,/<app-root>/);
});
