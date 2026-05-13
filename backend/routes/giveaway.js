const express = require('express');
const { db } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

async function autoFinish(g) {
  if (g.status === 'active' && new Date() >= new Date(g.ends_at)) {
    const participants = g.participants || [];
    const prizes = g.prizes || [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const winners = prizes.map((prize, i) => shuffled[i] ? { ...shuffled[i], prize } : null).filter(Boolean);
    await db.giveaways.updateAsync({ _id: g._id }, { $set: { status: 'finished', winners } });
    return { ...g, status: 'finished', winners };
  }
  return g;
}

// Creator or admin/officer: close a finished giveaway
router.post('/:id/close', requireAuth, async (req, res) => {
  const g = await db.giveaways.findOneAsync({ _id: req.params.id });
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  const isAdminOrOfficer = req.user.role === 'admin' || req.user.role === 'officer';
  const isCreator = g.created_by === req.user.id;
  if (!isAdminOrOfficer && !isCreator) return res.status(403).json({ error: 'No tenés permiso' });
  await db.giveaways.updateAsync({ _id: req.params.id }, { $set: { status: 'closed' } });
  res.json({ ok: true });
});

// Public: get current giveaway
router.get('/current', async (req, res) => {
  const docs = await db.giveaways.findAsync({ status: { $in: ['waiting', 'active', 'finished'] } }).sort({ created_at: -1 }).limit(1);
  if (!docs.length) return res.json(null);
  const g = await autoFinish(docs[0]);
  res.json({ ...g, id: g._id });
});

// Any authenticated user: create giveaway (max 3 concurrent)
router.post('/', requireAuth, async (req, res) => {
  const { title, prizes, duration } = req.body;
  if (!title || !prizes || !prizes.length) return res.status(400).json({ error: 'Faltan datos' });
  const active = await db.giveaways.findAsync({ status: { $in: ['waiting', 'active'] } });
  if (active.length >= 3) return res.status(400).json({ error: 'Máximo 3 sorteos activos al mismo tiempo. Esperá que finalice alguno.' });
  const dur = Math.max(10, parseInt(duration) || 60);
  const now = new Date();
  const endsAt = new Date(now.getTime() + dur * 1000);
  const g = await db.giveaways.insertAsync({
    title, prizes: Array.isArray(prizes) ? prizes : [prizes],
    duration: dur,
    status: 'active', participants: [], winners: [],
    created_by: req.user.id, created_by_name: req.user.username,
    created_at: now.toISOString(), started_at: now.toISOString(), ends_at: endsAt.toISOString(),
  });
  res.json({ ...g, id: g._id });
});

// Admin: start giveaway
router.post('/:id/start', requireAdmin, async (req, res) => {
  const g = await db.giveaways.findOneAsync({ _id: req.params.id });
  if (!g || g.status !== 'waiting') return res.status(400).json({ error: 'No se puede iniciar' });
  const now = new Date();
  const endsAt = new Date(now.getTime() + g.duration * 1000);
  await db.giveaways.updateAsync({ _id: req.params.id }, { $set: { status: 'active', started_at: now.toISOString(), ends_at: endsAt.toISOString() } });
  res.json({ ok: true });
});

// Creator or admin/officer: cancel
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const g = await db.giveaways.findOneAsync({ _id: req.params.id });
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  const isAdminOrOfficer = req.user.role === 'admin' || req.user.role === 'officer';
  const isCreator = g.created_by === req.user.id;
  if (!isAdminOrOfficer && !isCreator) return res.status(403).json({ error: 'No tenés permiso para cancelar este sorteo' });
  await db.giveaways.updateAsync({ _id: req.params.id }, { $set: { status: 'cancelled' } });
  res.json({ ok: true });
});

// User: join
router.post('/:id/join', requireAuth, async (req, res) => {
  const g = await db.giveaways.findOneAsync({ _id: req.params.id });
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  if (g.status !== 'active' && g.status !== 'waiting') return res.status(400).json({ error: 'El sorteo no está activo' });
  if ((g.participants || []).some(p => p.id === req.user.id)) return res.status(400).json({ error: 'Ya estás inscrito' });
  await db.giveaways.updateAsync({ _id: req.params.id }, { $push: { participants: { id: req.user.id, username: req.user.username } } });
  res.json({ ok: true });
});

// Admin: list all
router.get('/list', requireAdmin, async (req, res) => {
  const docs = await db.giveaways.findAsync({}).sort({ created_at: -1 }).limit(20);
  res.json(docs.map(g => ({ ...g, id: g._id })));
});

module.exports = router;
