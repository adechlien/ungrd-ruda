import {randomUUID} from 'node:crypto';
import {pool} from './db.mjs';
import {ApiError} from './repository.mjs';

export async function ownRecord(actor,id) {
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(400,'Identificador inválido.');
 if(!(await pool.query('SELECT 1 FROM registro WHERE id_registro=$1 AND id_funcionario=$2',[id,actor.id_funcionario])).rowCount)throw new ApiError(404,'Registro no encontrado.');
}
export function fileType(bytes) {
 if(!Buffer.isBuffer(bytes))return null;
 if(bytes.subarray(0,5).equals(Buffer.from('%PDF-')))return 'application/pdf';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 return null;
}
export async function saveActa(actor,id,name,bytes) {
 await ownRecord(actor,id);
 if(typeof name!=='string'||!name.trim()||name.length>180||/[\x00-\x1f\\/]/.test(name))throw new ApiError(400,'Nombre de archivo inválido.');
 const mime=fileType(bytes);
 if(!mime)throw new ApiError(422,'Adjunte un PDF o una imagen PNG/JPG.');
 if(!bytes.length||bytes.length>4194304)throw new ApiError(413,'El archivo debe pesar como máximo 4 MB.');
 const r=await pool.query(`INSERT INTO archivo_registro(id_archivo,id_registro,nombre,mime,contenido) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(id_registro) DO UPDATE SET nombre=EXCLUDED.nombre,mime=EXCLUDED.mime,contenido=EXCLUDED.contenido,creado_en=clock_timestamp()
 RETURNING nombre,mime,octet_length(contenido) AS bytes,creado_en AS "creadoEn"`,[randomUUID(),id,name.trim(),mime,bytes]);
 return r.rows[0];
}
export async function getActa(actor,id) {
 await ownRecord(actor,id);
 const r=await pool.query('SELECT * FROM archivo_registro WHERE id_registro=$1',[id]);
 if(!r.rowCount)throw new ApiError(404,'No hay un acta adjunta.');
 return r.rows[0];
}
export async function deleteActa(actor,id) {
 await ownRecord(actor,id);
 await pool.query('DELETE FROM archivo_registro WHERE id_registro=$1',[id]);
}
