const express = require('express');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Público: verificar jugador
router.get('/check', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Falta username' });
  const entry = await db.blacklist.findOneAsync({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  if (entry) return res.json({ blacklisted: true, reason: entry.reason, date: entry.created_at });
  // Check if user exists in guild
  const member = await db.users.findOneAsync({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  res.json({ blacklisted: false, isMember: !!member });
});

// Público: ver toda la blacklist
router.get('/', async (req, res) => {
  const list = await db.blacklist.findAsync({}).sort({ created_at: -1 });
  res.json(list.map(b => ({ ...b, id: b._id })));
});

// Admin: agregar a blacklist
router.post('/', requireAdmin, async (req, res) => {
  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ error: 'Falta username' });
  const exists = await db.blacklist.findOneAsync({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  if (exists) return res.status(400).json({ error: 'Ya está en la blacklist' });
  const admin = await db.users.findOneAsync({ _id: req.user.id });
  const entry = await db.blacklist.insertAsync({ username, reason: reason || 'Sin motivo especificado', added_by: req.user.id, added_by_name: admin?.username, created_at: new Date().toISOString() });
  res.json({ id: entry._id });
});

// Admin: quitar de blacklist
router.delete('/:id', requireAdmin, async (req, res) => {
  await db.blacklist.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
