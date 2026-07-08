const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../supabase');
const { requireAdmin, requireStrictAdmin } = require('../middleware/auth');
const router = express.Router();

const safe = u => {
  if (!u) return null;
  const { password, avatar_url, ...r } = u;
  return { ...r, avatar: avatar_url || null };
};

router.get('/stats', requireAdmin, async (req, res) => {
  const [
    { count: totalMembers },
    { count: pendingReports },
    { count: totalNews },
    { count: totalBuilds },
    { data: txs },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('death_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('builds').select('*', { count: 'exact', head: true }),
    supabase.from('coin_transactions').select('amount').eq('type', 'award'),
  ]);
  const totalCoinsAwarded = (txs || []).reduce((s, t) => s + (t.amount || 0), 0);
  res.json({ totalMembers, pendingReports, totalNews, totalBuilds, totalCoinsAwarded });
});

router.get('/transactions', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('coin_transactions').select('*').order('created_at', { ascending: false }).limit(100);
  res.json(data || []);
});

router.post('/coins/adjust', requireStrictAdmin, async (req, res) => {
  const { user_id, amount, reason } = req.body;
  if (!user_id || amount === undefined) return res.status(400).json({ error: 'Faltan campos' });
  const num = parseInt(amount);
  const { data: u } = await supabase.from('users').select('coins,username').eq('id', user_id).maybeSingle();
  await supabase.from('users').update({ coins: (u?.coins || 0) + num }).eq('id', user_id);
  await supabase.from('coin_transactions').insert({
    user_id, username: u?.username, amount: num, type: 'adjust',
    reason: reason || 'Ajuste manual', admin_id: req.user.id,
  });
  res.json({ ok: true });
});

router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  const hash = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from('users').insert({
    username, password: hash, role: role || 'member',
    coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0,
  }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Usuario ya existe' });
    return res.status(500).json({ error: error.message });
  }
  res.json(safe(data));
});

router.delete('/users/:id', requireStrictAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// Listar usuarios pendientes
router.get('/pending', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('users').select('id,username,role,created_at').eq('role', 'pending').order('created_at', { ascending: true });
  res.json(data || []);
});

// Aprobar usuario pendiente (officers solo pueden dar member/officer, no admin)
router.post('/users/:id/approve', requireAdmin, async (req, res) => {
  const { role } = req.body;
  const isStrictAdmin = req.user.role === 'admin';
  const allowed = isStrictAdmin ? ['member','officer','admin'] : ['member','officer'];
  const newRole = allowed.includes(role) ? role : 'member';
  await supabase.from('users').update({ role: newRole }).eq('id', req.params.id);
  res.json({ ok: true });
});

// Rechazar y eliminar usuario pendiente (officers solo pueden rechazar pending)
router.delete('/users/:id/reject', requireAdmin, async (req, res) => {
  const isStrictAdmin = req.user.role === 'admin';
  if (!isStrictAdmin) {
    const { data: u } = await supabase.from('users').select('role').eq('id', req.params.id).maybeSingle();
    if (u && u.role !== 'pending') return res.status(403).json({ error: 'Solo el administrador puede expulsar miembros' });
  }
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

// Editar username de cualquier usuario
router.put('/users/:id/username', requireAdmin, async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 2) return res.status(400).json({ error: 'Nombre inválido' });
  const { error } = await supabase.from('users').update({ username: username.trim() }).eq('id', req.params.id);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Ese nombre ya existe' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ ok: true });
});

router.post('/users/:id/reset-password', requireStrictAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  const hashed = bcrypt.hashSync(new_password, 10);
  const { error } = await supabase.from('users').update({ password: hashed }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
