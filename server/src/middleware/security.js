const crypto = require('crypto');

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const csrfProtection = (req, res, next) => {
  if (!unsafeMethods.has(req.method) || !req.cookies?.auth_token) return next();
  const token = req.get('x-csrf-token');
  if (!token || !req.user?.csrfToken || Buffer.byteLength(token) !== Buffer.byteLength(req.user.csrfToken) || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(req.user.csrfToken))) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
};

const rejectOperatorKeys = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => key.startsWith('$') || key.includes('.') || rejectOperatorKeys(child));
};

const rejectNoSqlOperators = (req, res, next) => {
  if (rejectOperatorKeys(req.body) || rejectOperatorKeys(req.query) || rejectOperatorKeys(req.params)) {
    return res.status(400).json({ message: 'Invalid request input' });
  }
  next();
};

module.exports = { csrfProtection, rejectNoSqlOperators };
