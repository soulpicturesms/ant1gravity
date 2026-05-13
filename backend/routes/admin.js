const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAdmin, async (req, res) => {
  const totalMembers = await db.users.countAsync({});
  const pendingReports = await db.reports.countAsync({ status: 'pending' });
  const totalNews = await db.news.countAsync({});
  const totalBuilds = await db.builds.countAsync({});
  const txs = await db.transactions.findAsync({ type: 'award' });
  const totalCoinsAwarded = txs.reduce((s, t) => s + (t.amount || 0), 0);
  res.json({ totalMembers, pendingReports, totalNews, totalBuilds, totalCoinsAwarded });
});

router.get('/transactions', requireAdmin, async (req, res) => {
  const txs = await db.transactions.findAsync({}).sort({ created_at: -1 }).limit(100);
  res.json(txs.map(t => ({ ...t, id: t._id })));
});

router.post('/coins/adjust', requireAdmin, async (req, res) => {
  const { user_id, amount, reason } = req.body;
  if (!user_id || amount === undefined) return res.status(400).json({ error: 'Faltan campos' });
  const num = parseInt(amount);
  const u = await db.users.findOneAsync({ _id: user_id });
  await db.users.updateAsync({ _id: user_id }, { $set: { coins: (u?.coins || 0) + num } });
  await db.transactions.insertAsync({ user_id, username: u?.username, amount: num, type: 'adjust', reason: reason || 'Ajuste manual', admin_id: req.user.id, created_at: new Date().toISOString() });
  res.json({ ok: true });
});

router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const user = await db.users.insertAsync({ username, password: hash, role: role || 'member', avatar: null, coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0, created_at: new Date().toISOString() });
    const { password: _, ...safe } = user;
    res.json({ ...safe, id: safe._id });
  } catch (e) {
    if (e.errorType === 'uniqueViolated') return res.status(400).json({ error: 'Usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  await db.users.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
