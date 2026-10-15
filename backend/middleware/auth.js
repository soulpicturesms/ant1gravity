const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase');
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

// Verifica el rol actual desde la DB para evitar que tokens con rol stale (ej: 'pending') fallen
async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const { data: u } = await supabase.from('users').select('role').eq('id', req.user.id).maybeSingle();
    if (!u) return res.status(401).json({ error: 'No autorizado' });
    req.user.role = u.role;
    if (req.user.role !== 'admin' && req.user.role !== 'officer') {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Solo admin puro (no officer)
async function requireStrictAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const { data: u } = await supabase.from('users').select('role').eq('id', req.user.id).maybeSingle();
    if (!u) return res.status(401).json({ error: 'No autorizado' });
    req.user.role = u.role;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { requireAuth, requireAdmin, requireStrictAdmin, JWT_SECRET };
