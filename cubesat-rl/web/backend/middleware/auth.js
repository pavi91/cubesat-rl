/**
 * JWT Authentication Middleware
 * Verifies Bearer token on protected routes.
 * Attaches decoded user payload to req.user.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cubesat-rl-secret-2026-change-in-prod';

function requireAuth(req, res, next) {
  let token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header or token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role '${req.user.role}' is not allowed` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
