const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'ant1gravity_secret_dev';

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'officer') {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
