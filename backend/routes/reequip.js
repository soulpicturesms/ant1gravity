const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const screensDir = path.join(__dirname, '../uploads/screenshots');
if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: screensDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.get('/presets', requireAuth, async (req, res) => {
  const presets = await db.presets.findAsync({}).sort({ slot: 1, coin_value: -1 });
  res.json(presets.map(p => ({ ...p, id: p._id })));
});

router.post('/report', requireAuth, upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Se requiere screenshot' });
  const user = await db.users.findOneAsync({ _id: req.user.id });
  const report = await db.reports.insertAsync({
    user_id: req.user.id, username: user?.username, avatar: user?.avatar,
    screenshot_url: `/uploads/screenshots/${req.file.filename}`,
    description: req.body.description || null, status: 'pending',
    coins_awarded: 0, claimed: false, created_at: new Date().toISOString()
  });
  res.json({ id: report._id });
});

router.get('/my-reports', requireAuth, async (req, res) => {
  const reports = await db.reports.findAsync({ user_id: req.user.id }).sort({ created_at: -1 });
  res.json(reports.map(r => ({ ...r, id: r._id })));
});

router.post('/report/:id/claim', requireAuth, async (req, res) => {
  const report = await db.reports.findOneAsync({ _id: req.params.id, user_id: req.user.id });
  if (!report) return res.status(404).json({ error: 'No encontrado' });
  if (report.status !== 'approved') return res.status(400).json({ error: 'No aprobado aún' });
  if (report.claimed) return res.status(400).json({ error: 'Ya reclamado' });
  await db.reports.updateAsync({ _id: req.params.id }, { $set: { claimed: true } });
  res.json({ ok: true });
});

router.get('/admin/reports', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const reports = await db.reports.findAsync(query).sort({ created_at: -1 });
  res.json(reports.map(r => ({ ...r, id: r._id })));
});

router.post('/admin/report/:id/award', requireAdmin, async (req, res) => {
  const { preset_ids, custom_amount, admin_notes } = req.body;
  const report = await db.reports.findOneAsync({ _id: req.params.id });
  if (!report) return res.status(404).json({ error: 'No encontrado' });

  let totalCoins = parseInt(custom_amount) || 0;
  const itemNames = [];

  if (preset_ids?.length > 0) {
    for (const pid of preset_ids) {
      const preset = await db.presets.findOneAsync({ _id: pid });
      if (preset) { totalCoins += preset.coin_value; itemNames.push(`${preset.name} (${preset.coin_value})`); }
    }
  }

  await db.reports.updateAsync({ _id: req.params.id }, { $set: { status: 'approved', coins_awarded: totalCoins, items_lost: itemNames.join(', ') || null, admin_notes: admin_notes || null, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() } });

  const u = await db.users.findOneAsync({ _id: report.user_id });
  await db.users.updateAsync({ _id: report.user_id }, { $set: { coins: (u?.coins || 0) + totalCoins } });
  await db.transactions.insertAsync({ user_id: report.user_id, username: report.username, amount: totalCoins, type: 'award', reason: `Reequipo Reporte #${req.params.id.slice(-6)}`, admin_id: req.user.id, report_id: req.params.id, created_at: new Date().toISOString() });

  res.json({ ok: true, coins_awarded: totalCoins });
});

router.post('/admin/report/:id/reject', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  await db.reports.updateAsync({ _id: req.params.id }, { $set: { status: 'rejected', admin_notes: admin_notes || null, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() } });
  res.json({ ok: true });
});

router.post('/admin/presets', requireAdmin, async (req, res) => {
  const { name, slot, coin_value, tier } = req.body;
  const p = await db.presets.insertAsync({ name, slot, coin_value: parseInt(coin_value), tier: tier || 'T8', created_at: new Date().toISOString() });
  res.json({ id: p._id });
});

router.put('/admin/presets/:id', requireAdmin, async (req, res) => {
  const { name, slot, coin_value, tier } = req.body;
  await db.presets.updateAsync({ _id: req.params.id }, { $set: { name, slot, coin_value: parseInt(coin_value), tier } });
  res.json({ ok: true });
});

router.delete('/admin/presets/:id', requireAdmin, async (req, res) => {
  await db.presets.removeAsync({ _id: req.params.id }, {});
  res.json({ ok: true });
});

module.exports = router;
