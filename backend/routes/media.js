const express = require('express');
const multer = require('multer');
const { supabase, uploadFile } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/weekly-prize', async (req, res) => {
  const { data } = await supabase.from('media').select('*').eq('key', 'weekly_prize').maybeSingle();
  res.json(data || null);
});

router.post('/weekly-prize', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  try {
    const url = await uploadFile('media', `weekly-prize-${Date.now()}`, req.file.buffer, req.file.mimetype);
    await supabase.from('media').delete().eq('key', 'weekly_prize');
    await supabase.from('media').insert({ key: 'weekly_prize', url });
    res.json({ url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/weekly-prize', requireAdmin, async (req, res) => {
  await supabase.from('media').delete().eq('key', 'weekly_prize');
  res.json({ ok: true });
});

router.get('/banners', async (req, res) => {
  const { data } = await supabase.from('media').select('*').eq('key', 'banner').order('order').order('uploaded_at');
  res.json(data || []);
});

router.post('/banners', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  try {
    const { caption } = req.body;
    const url = await uploadFile('media', `banner-${Date.now()}`, req.file.buffer, req.file.mimetype);
    const { count } = await supabase.from('media').select('*', { count: 'exact', head: true }).eq('key', 'banner');
    const { data, error } = await supabase.from('media').insert({
      key: 'banner', url, caption: caption || '', order: count || 0,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/banners/:id', requireAdmin, async (req, res) => {
  await supabase.from('media').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
