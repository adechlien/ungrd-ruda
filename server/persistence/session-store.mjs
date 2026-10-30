const actorSql = `SELECT u.*,f.id_organizacion,f.nombre_completo,f.documento,o.nombre AS organizacion,o.tipo
 FROM usuario u JOIN funcionario f USING(id_funcionario) JOIN organizacion o USING(id_organizacion)`;

/** PostgreSQL adapter for the session service's user/session persistence contract. */
export function createSessionStore(database) {
 return {
  async findActiveUser(email) {
   const result = await database.query(actorSql + ' WHERE lower(u.correo)=lower($1) AND u.activo', [email]);
   return result.rows[0] ?? null;
  },
  async findActiveSession(tokenHash) {
   const result = await database.query(actorSql + ' JOIN sesion s USING(id_usuario) WHERE s.token_hash=$1 AND s.expira_en>now() AND u.activo', [tokenHash]);
   return result.rows[0] ?? null;
  },
  async create(tokenHash, userId) {
   await database.query("INSERT INTO sesion(token_hash,id_usuario,expira_en) VALUES($1,$2,now()+interval '8 hours')", [tokenHash, userId]);
  },
  async remove(tokenHash) {
   await database.query('DELETE FROM sesion WHERE token_hash=$1', [tokenHash]);
  },
 };
}
