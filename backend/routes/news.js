const express = require('express');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  const news = await db.news.findAsync({}).sort({ pinned: -1, created_at: -1 }).limit(50);
  res.json(news.map(n => ({ ...n, id: n._id })));
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, content, image_url, pinned, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const user = await db.users.findOneAsync({ _id: req.user.id });
  const post = await db.news.insertAsync({ title, content, image_url: image_url || null, pinned: !!pinned, category: category || 'general', author_id: req.user.id, author_name: user?.username, created_at: new Date().toISOString() });
  res.json({ id: post._id });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, content, image_url, pinned, category } = req.body;
  await db.news.updateAsync({ _id: req.params.id }, { $set: { title, content, image_url: image_url || null, pinned: !!pinned, category: category || 'general' } });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await db.news.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
