const express = require('express');
const multer = require('multer');
const { supabase, uploadFile } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const { category } = req.query;
  let query = supabase.from('builds').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data } = await query;
  res.json(data || []);
});

router.get('/:id', async (req, res) => {
  const { data } = await supabase.from('builds').select('*').eq('id', req.params.id).maybeSingle();
  if (!data) return res.status(404).json({ error: 'No encontrado' });
  res.json(data);
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, category, description, items } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Título y categoría requeridos' });
  const { data: user } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  let image_url = null;
  if (req.file) {
    try {
      image_url = await uploadFile('builds', `${Date.now()}-${req.file.originalname}`, req.file.buffer, req.file.mimetype);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  const { data, error } = await supabase.from('builds').insert({
    title, category, description: description || null, items: items || null,
    image_url, author_id: req.user.id, author_name: user?.username, featured: false,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, category, description, items, featured } = req.body;
  const { data: existing } = await supabase.from('builds').select('image_url').eq('id', req.params.id).maybeSingle();
  let image_url = existing?.image_url;
  if (req.file) {
    try {
      image_url = await uploadFile('builds', `${Date.now()}-${req.file.originalname}`, req.file.buffer, req.file.mimetype);
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  await supabase.from('builds').update({
    title, category, description: description || null, items: items || null,
    image_url, featured: featured === 'true',
  }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('builds').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
