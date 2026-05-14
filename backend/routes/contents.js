const express = require('express');
const { supabase } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET all contents (with their variants)
router.get('/', async (req, res) => {
  const { category } = req.query;
  let q = supabase.from('build_contents').select('*').order('created_at', { ascending: false });
  if (category && category !== 'Todas') q = q.eq('category', category);
  const { data: contents, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  if (!contents?.length) return res.json([]);

  const ids = contents.map(c => c.id);
  const { data: variants } = await supabase
    .from('build_variants')
    .select('*')
    .in('content_id', ids)
    .order('sort_order', { ascending: true });

  const variantsByContent = {};
  for (const v of (variants || [])) {
    if (!variantsByContent[v.content_id]) variantsByContent[v.content_id] = [];
    variantsByContent[v.content_id].push(v);
  }

  res.json(contents.map(c => ({ ...c, variants: variantsByContent[c.id] || [] })));
});

// GET single content
router.get('/:id', async (req, res) => {
  const { data: content } = await supabase.from('build_contents').select('*').eq('id', req.params.id).maybeSingle();
  if (!content) return res.status(404).json({ error: 'No encontrado' });
  const { data: variants } = await supabase.from('build_variants').select('*').eq('content_id', content.id).order('sort_order');
  res.json({ ...content, variants: variants || [] });
});

// POST create content + variants
router.post('/', requireAdmin, async (req, res) => {
  const { name, category, description, shared_items, variants } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Nombre y categoría requeridos' });

  const { data: user } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  const { data: content, error } = await supabase.from('build_contents').insert({
    name, category, description: description || null,
    shared_items: shared_items || {},
    author_id: req.user.id, author_name: user?.username,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (variants?.length) {
    const rows = variants.map((v, i) => ({
      content_id: content.id,
      role: v.role,
      sort_order: i,
      equipment: v.equipment || {},
      equipment_alt: v.has_alt ? (v.equipment_alt || {}) : null,
      has_alt: !!v.has_alt,
      notes: v.notes || null,
    }));
    const { error: ve } = await supabase.from('build_variants').insert(rows);
    if (ve) return res.status(500).json({ error: ve.message });
  }

  res.json({ id: content.id });
});

// PUT update content + variants (full replace)
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, category, description, shared_items, variants } = req.body;

  await supabase.from('build_contents').update({
    name, category, description: description || null,
    shared_items: shared_items || {},
  }).eq('id', req.params.id);

  // Replace variants
  await supabase.from('build_variants').delete().eq('content_id', req.params.id);
  if (variants?.length) {
    const rows = variants.map((v, i) => ({
      content_id: req.params.id,
      role: v.role,
      sort_order: i,
      equipment: v.equipment || {},
      equipment_alt: v.has_alt ? (v.equipment_alt || {}) : null,
      has_alt: !!v.has_alt,
      notes: v.notes || null,
    }));
    await supabase.from('build_variants').insert(rows);
  }

  res.json({ ok: true });
});

// DELETE content (cascades to variants)
router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('build_contents').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
