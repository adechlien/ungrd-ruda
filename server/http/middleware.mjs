export function securityHeaders(origins) {
 const allowed = new Set(origins);
 return (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
   let origin;
   try { origin = new URL(req.headers.origin); }
   catch { return res.status(403).json({message: 'Origen no permitido.'}); }
   if (!allowed.has(origin.origin)) return res.status(403).json({message: 'Origen no permitido.'});
  }
  next();
 };
}

export function requireSession(sessions) {
 return async (req, res, next) => {
  const token = (req.headers.cookie || '').split(';').map(value => value.trim())
   .find(value => value.startsWith('ruda_session='))?.split('=')[1];
  req.actor = await sessions.authenticate(token);
  req.token = token;
  next();
 };
}

export function apiErrorHandler(logger = console) {
 return (error, req, res, next) => {
  const status = error.status || (['23505', '23514', '23503', '22P02'].includes(error.code) ? 422 : 500);
  if (status === 500) logger.error('Error de API:', error.message);
  res.status(status).json({
   message: error.type === 'entity.too.large' ? 'El archivo o la solicitud supera el tamaño permitido (actas: 4 MB).'
    : status === 500 ? 'No se pudo completar la operación.'
    : error.status ? error.message : 'Los datos no cumplen las restricciones del modelo.',
   issues: error.issues || [],
  });
 };
}
