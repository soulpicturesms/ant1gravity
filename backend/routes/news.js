const express = require('express');
const { supabase } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const fmt = n => ({ ...n, pinned: n.pinned ? 1 : 0 });

router.get('/', async (req, res) => {
  const { data } = await supabase.from('news').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50);
  res.json((data || []).map(fmt));
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, content, image_url, pinned, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const { data: user } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  const { data, error } = await supabase.from('news').insert({
    title, content, image_url: image_url || null,
    pinned: !!pinned, category: category || 'general',
    author_id: req.user.id, author_name: user?.username,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, content, image_url, pinned, category } = req.body;
  await supabase.from('news').update({
    title, content, image_url: image_url || null,
    pinned: !!pinned, category: category || 'general',
  }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('news').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
