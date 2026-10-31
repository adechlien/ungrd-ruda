export function createAttachmentStore(database) {
 return {
  async save(id, name, mime, bytes, fileId) {
   const result = await database.query(`INSERT INTO archivo_registro(id_archivo,id_registro,nombre,mime,contenido) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(id_registro) DO UPDATE SET nombre=EXCLUDED.nombre,mime=EXCLUDED.mime,contenido=EXCLUDED.contenido,creado_en=clock_timestamp()
    RETURNING nombre,mime,octet_length(contenido) AS bytes,creado_en AS "creadoEn"`, [fileId, id, name, mime, bytes]);
   return result.rows[0];
  },
  async get(id) {return (await database.query('SELECT * FROM archivo_registro WHERE id_registro=$1', [id])).rows[0];},
  async remove(id) {await database.query('DELETE FROM archivo_registro WHERE id_registro=$1', [id]);},
 };
}
