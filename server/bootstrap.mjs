import { pool, transaction } from './db.mjs';
import { hashPassword } from './auth.mjs';
import { prepareCatalogs, ensureOrganization } from './persistence/catalog-store.mjs';

// Preparacion explicita de una instalacion nueva, sin registros de ejemplo.
const email = (process.env.RUDA_USER_EMAIL || '').trim().toLowerCase();
const name = (process.env.RUDA_USER_NAME || '').trim();
const document = (process.env.RUDA_USER_DOCUMENT || '').trim();
const password = process.env.RUDA_USER_PASSWORD || '';
try {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !document || password.length < 12)
    throw Error(
      'Defina RUDA_USER_EMAIL, RUDA_USER_NAME, RUDA_USER_DOCUMENT y RUDA_USER_PASSWORD (minimo 12 caracteres).',
    );
  await transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(9145702)');
    if ((await c.query('SELECT 1 FROM usuario WHERE lower(correo)=$1', [email])).rowCount)
      throw Error('La cuenta ya existe. No se modifico su clave ni su informacion.');
    await prepareCatalogs(c);
    const organizationId = await ensureOrganization(c);
    const actor = (
      await c.query(
        "INSERT INTO funcionario(id_organizacion,nombre_completo,cargo,documento) VALUES($1,$2,'Funcionario',$3) RETURNING id_funcionario",
        [organizationId, name, document],
      )
    ).rows[0];
    await c.query('INSERT INTO usuario(id_funcionario,correo,password_hash) VALUES($1,$2,$3)', [
      actor.id_funcionario,
      email,
      hashPassword(password),
    ]);
  });
  console.log('Catalogos preparados y cuenta creada. No se cargaron registros de demostracion.');
} finally {
  await pool.end();
}
