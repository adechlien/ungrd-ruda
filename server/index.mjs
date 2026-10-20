import {app} from './app.mjs';
import {pool} from './db.mjs';
export {app};
const server=app.listen(Number(process.env.API_PORT||4310),'127.0.0.1',()=>console.log('API RUDA: http://127.0.0.1:'+(process.env.API_PORT||4310)));
process.on('SIGTERM',()=>server.close(()=>pool.end()));
