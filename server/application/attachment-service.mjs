import {ApiError} from '../errors.mjs';

export function fileType(bytes) {
 if(!Buffer.isBuffer(bytes))return null;
 if(bytes.subarray(0,5).equals(Buffer.from('%PDF-')))return 'application/pdf';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 return null;
}

/** File rules require only ownership checks, binary persistence and an identifier generator. */
export function createAttachmentService({records, files, newId}) {
 async function requireOwner(actor, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, 'Identificador inválido.');
  if (!await records.isOwned(actor, id)) throw new ApiError(404, 'Registro no encontrado.');
 }
 return {
  async save(actor, id, name, bytes) {
   await requireOwner(actor, id);
   if (typeof name !== 'string' || !name.trim() || name.length > 180 || /[\x00-\x1f\\/]/.test(name)) throw new ApiError(400, 'Nombre de archivo inválido.');
   const mime = fileType(bytes);
   if (!mime) throw new ApiError(422, 'Adjunte un PDF o una imagen PNG/JPG.');
   if (!bytes.length || bytes.length > 4194304) throw new ApiError(413, 'El archivo debe pesar como máximo 4 MB.');
   return files.save(id, name.trim(), mime, bytes, newId());
  },
  async get(actor, id) {
   await requireOwner(actor, id);
   const file = await files.get(id);
   if (!file) throw new ApiError(404, 'No hay un acta adjunta.');
   return file;
  },
  async remove(actor, id) {await requireOwner(actor, id); await files.remove(id);},
 };
}
