const express = require('express');
const multer = require('multer');
const { supabase, uploadFile } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/presets', requireAuth, async (req, res) => {
  const { data } = await supabase.from('equipment_presets').select('*').order('slot').order('coin_value', { ascending: false });
  res.json(data || []);
});

router.post('/report', requireAuth, upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Se requiere screenshot' });
  const { data: user } = await supabase.from('users').select('username,avatar_url').eq('id', req.user.id).maybeSingle();
  let screenshot_url;
  try {
    screenshot_url = await uploadFile('screenshots', `${Date.now()}-${req.file.originalname}`, req.file.buffer, req.file.mimetype);
  } catch (e) { return res.status(500).json({ error: e.message }); }
  const { data, error } = await supabase.from('death_reports').insert({
    user_id: req.user.id, username: user?.username, avatar_url: user?.avatar_url,
    screenshot_url, description: req.body.description || null,
    status: 'pending', coins_awarded: 0, claimed: false,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.get('/my-reports', requireAuth, async (req, res) => {
  const { data } = await supabase.from('death_reports').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  res.json(data || []);
});

router.post('/report/:id/claim', requireAuth, async (req, res) => {
  const { data: report } = await supabase.from('death_reports').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!report) return res.status(404).json({ error: 'No encontrado' });
  if (report.status !== 'approved') return res.status(400).json({ error: 'No aprobado aún' });
  if (report.claimed) return res.status(400).json({ error: 'Ya reclamado' });
  await supabase.from('death_reports').update({ claimed: true }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.get('/admin/reports', requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('death_reports').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  res.json(data || []);
});

router.post('/admin/report/:id/award', requireAdmin, async (req, res) => {
  const { preset_ids, custom_amount, admin_notes } = req.body;
  const { data: report } = await supabase.from('death_reports').select('*').eq('id', req.params.id).maybeSingle();
  if (!report) return res.status(404).json({ error: 'No encontrado' });

  let totalCoins = parseInt(custom_amount) || 0;
  const itemNames = [];

  if (preset_ids?.length > 0) {
    for (const pid of preset_ids) {
      const { data: preset } = await supabase.from('equipment_presets').select('*').eq('id', pid).maybeSingle();
      if (preset) { totalCoins += preset.coin_value; itemNames.push(`${preset.name} (${preset.coin_value})`); }
    }
  }

  await supabase.from('death_reports').update({
    status: 'approved', coins_awarded: totalCoins,
    items_lost: itemNames.join(', ') || null, admin_notes: admin_notes || null,
    reviewed_by: req.user.id, reviewed_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  const { data: u } = await supabase.from('users').select('coins').eq('id', report.user_id).maybeSingle();
  await supabase.from('users').update({ coins: (u?.coins || 0) + totalCoins }).eq('id', report.user_id);
  await supabase.from('coin_transactions').insert({
    user_id: report.user_id, username: report.username, amount: totalCoins,
    type: 'award', reason: `Reequipo Reporte #${req.params.id.slice(-6)}`,
    admin_id: req.user.id, report_id: req.params.id,
  });

  res.json({ ok: true, coins_awarded: totalCoins });
});

router.post('/admin/report/:id/reject', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  await supabase.from('death_reports').update({
    status: 'rejected', admin_notes: admin_notes || null,
    reviewed_by: req.user.id, reviewed_at: new Date().toISOString(),
  }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.post('/admin/presets', requireAdmin, async (req, res) => {
  const { name, slot, coin_value, tier } = req.body;
  const { data, error } = await supabase.from('equipment_presets').insert({
    name, slot, coin_value: parseInt(coin_value), tier: tier || 'T8',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.put('/admin/presets/:id', requireAdmin, async (req, res) => {
  const { name, slot, coin_value, tier } = req.body;
  await supabase.from('equipment_presets').update({ name, slot, coin_value: parseInt(coin_value), tier }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/presets/:id', requireAdmin, async (req, res) => {
  await supabase.from('equipment_presets').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
