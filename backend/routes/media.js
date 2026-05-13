const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const mediaDir = path.join(__dirname, '../uploads/media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: mediaDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Public: get weekly prize image
router.get('/weekly-prize', async (req, res) => {
  const doc = await db.media.findOneAsync({ key: 'weekly_prize' });
  res.json(doc || null);
});

// Admin: upload weekly prize image
router.post('/weekly-prize', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  const url = `/uploads/media/${req.file.filename}`;
  await db.media.removeAsync({ key: 'weekly_prize' }, { multi: true });
  await db.media.insertAsync({ key: 'weekly_prize', url, uploaded_at: new Date().toISOString() });
  res.json({ url });
});

// Admin: delete weekly prize image
router.delete('/weekly-prize', requireAdmin, async (req, res) => {
  await db.media.removeAsync({ key: 'weekly_prize' }, { multi: true });
  res.json({ ok: true });
});

// Public: get banner slides
router.get('/banners', async (req, res) => {
  const docs = await db.media.findAsync({ key: 'banner' }).sort({ order: 1, uploaded_at: 1 });
  res.json(docs);
});

// Admin: upload banner slide
router.post('/banners', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  const { caption } = req.body;
  const url = `/uploads/media/${req.file.filename}`;
  const count = await db.media.countAsync({ key: 'banner' });
  const doc = await db.media.insertAsync({ key: 'banner', url, caption: caption || '', order: count, uploaded_at: new Date().toISOString() });
  res.json({ ...doc, id: doc._id });
});

// Admin: delete banner slide
router.delete('/banners/:id', requireAdmin, async (req, res) => {
  await db.media.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
