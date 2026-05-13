const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const buildsDir = path.join(__dirname, '../uploads/builds');
if (!fs.existsSync(buildsDir)) fs.mkdirSync(buildsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: buildsDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
  const { category } = req.query;
  const query = category ? { category } : {};
  const builds = await db.builds.findAsync(query).sort({ featured: -1, created_at: -1 });
  res.json(builds.map(b => ({ ...b, id: b._id })));
});

router.get('/:id', async (req, res) => {
  const build = await db.builds.findOneAsync({ _id: req.params.id });
  if (!build) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ...build, id: build._id });
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, category, description, items } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Título y categoría requeridos' });
  const user = await db.users.findOneAsync({ _id: req.user.id });
  const image_url = req.file ? `/uploads/builds/${req.file.filename}` : null;
  const build = await db.builds.insertAsync({ title, category, description: description || null, items: items || null, image_url, author_id: req.user.id, author_name: user?.username, featured: false, created_at: new Date().toISOString() });
  res.json({ id: build._id });
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, category, description, items, featured } = req.body;
  const existing = await db.builds.findOneAsync({ _id: req.params.id });
  const image_url = req.file ? `/uploads/builds/${req.file.filename}` : existing?.image_url;
  await db.builds.updateAsync({ _id: req.params.id }, { $set: { title, category, description: description || null, items: items || null, image_url, featured: featured === 'true' } });
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await db.builds.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
