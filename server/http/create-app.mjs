import express from 'express';
import { publicActor } from '../application/session-service.mjs';
import { securityHeaders, requireSession, apiErrorHandler } from './middleware.mjs';

/** HTTP composition accepts only the capabilities used by its routes. Importing it does not open a database. */
export function createApp(
  { sessions, records, events, attachments, statistics, health },
  config = {},
) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== undefined && config.trustProxy !== '') {
    const hops = Number(config.trustProxy);
    if (!Number.isInteger(hops) || hops < 0)
      throw Error('TRUST_PROXY debe ser un numero entero no negativo.');
    app.set('trust proxy', hops);
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeaders(config.origins || []));
  app.get('/api/health', async (req, res) => {
    await health();
    res.json({ status: 'ok', database: 'PostgreSQL' });
  });
  app.post('/api/auth/login', async (req, res) => {
    const { token, user } = await sessions.login(req.body, req.ip);
    res.cookie('ruda_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.mode === 'production',
      maxAge: 8 * 3600000,
      path: '/api',
    });
    res.json(user);
  });
  app.use('/api', requireSession(sessions));
  app.get('/api/auth/me', (req, res) => res.json(publicActor(req.actor)));
  app.post('/api/auth/logout', async (req, res) => {
    await sessions.logout(req.token);
    res.clearCookie('ruda_session', { path: '/api' });
    res.sendStatus(204);
  });
  app.get('/api/forms', async (req, res) => res.json(await records.list(req.actor)));
  app.get('/api/forms/:id/history', async (req, res) =>
    res.json(await records.history(req.actor, req.params.id)),
  );
  app.put('/api/forms/:id', async (req, res) =>
    res.json(await records.save(req.actor, req.params.id, req.body, false)),
  );
  app.post('/api/forms/:id/finish', async (req, res) =>
    res.json(await records.save(req.actor, req.params.id, req.body, true)),
  );
  app.get('/api/events', async (req, res) => res.json(await events.list(req.actor)));
  app.get('/api/statistics', async (req, res) => res.json(await statistics.get(req.actor)));
  app.put(
    '/api/forms/:id/acta',
    express.raw({ type: 'application/octet-stream', limit: '4mb' }),
    async (req, res) =>
      res.json(await attachments.save(req.actor, req.params.id, req.query.nombre, req.body)),
  );
  app.get('/api/forms/:id/acta', async (req, res) => {
    const file = await attachments.get(req.actor, req.params.id);
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      "attachment; filename*=UTF-8''" + encodeURIComponent(file.nombre),
    );
    res.send(file.contenido);
  });
  app.delete('/api/forms/:id/acta', async (req, res) => {
    await attachments.remove(req.actor, req.params.id);
    res.sendStatus(204);
  });
  app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));
  app.use(apiErrorHandler(config.logger));
  return app;
}
