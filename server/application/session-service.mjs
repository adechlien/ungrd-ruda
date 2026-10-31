import { ApiError } from '../errors.mjs';

/** @typedef {{findActiveUser: Function, findActiveSession: Function, create: Function, remove: Function}} SessionStore */
export const publicActor = (actor) => ({
  id: actor.id_usuario,
  funcionarioId: actor.id_funcionario,
  name: actor.nombre_completo,
  email: actor.correo,
  role: actor.rol,
  organization: actor.organizacion,
  organizationType: actor.tipo,
  document: actor.documento,
});

/** Session rules depend on persistence, password verification and token capabilities, not PostgreSQL or HTTP. */
export function createSessionService({ sessions, passwords, tokens, now = Date.now }) {
  const attempts = new Map();
  return {
    async login(input, ip) {
      const time = now();
      let rate = attempts.get(ip);
      if (!rate || time - rate.start > 60000) rate = { start: time, count: 0 };
      rate.count++;
      attempts.set(ip, rate);
      if (rate.count > 10) throw new ApiError(429, 'Demasiados intentos. Espere un minuto.');
      const { email, password } = input || {};
      if (typeof email !== 'string' || typeof password !== 'string' || password.length > 200)
        throw new ApiError(400, 'Ingrese correo y contraseña.');
      const actor = await sessions.findActiveUser(email.trim());
      if (!actor || !(await passwords.verify(password, actor.password_hash)))
        throw new ApiError(401, 'Correo o contraseña incorrectos.');
      const token = tokens.create();
      await sessions.create(tokens.hash(token), actor.id_usuario);
      return { token, user: publicActor(actor) };
    },
    async authenticate(token) {
      if (!token) throw new ApiError(401, 'Inicie sesión para continuar.');
      const actor = await sessions.findActiveSession(tokens.hash(token));
      if (!actor) throw new ApiError(401, 'La sesión expiró. Inicie sesión nuevamente.');
      return actor;
    },
    async logout(token) {
      await sessions.remove(tokens.hash(token));
    },
  };
}
