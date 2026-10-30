'use strict';

const { verifyToken } = require('../auth');

/**
 * Exige um token Bearer válido e coloca o usuário em `req.user`.
 * @type {import('express').RequestHandler}
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Restringe a rota a determinados papéis.
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
