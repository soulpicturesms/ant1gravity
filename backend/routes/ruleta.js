const express = require('express');
const { supabase } = require('../supabase');
const { requireStrictAdmin } = require('../middleware/auth');
const router = express.Router();

const KEY = 'ruleta_prizes';

const DEFAULT_PRIZES = [
  'Blindado T7', 'Buey T8', 'Gallardo', 'Husky', 'Garrapresta',
  'Mula', 'Buey T7', 'Blindado T8', 'Blindado T6',
  'Lagarto de Pantano T7 Común', 'Mula de Combate',
  'Carnero de Hielo', 'Cimarrón de Martlok', 'Ave de Terror',
];

router.get('/prizes', async (req, res) => {
  const { data } = await supabase.from('rankings_cache').select('data').eq('type', KEY).maybeSingle();
  res.json(data?.data || DEFAULT_PRIZES);
});

router.put('/prizes', requireStrictAdmin, async (req, res) => {
  const { prizes } = req.body;
  if (!Array.isArray(prizes) || prizes.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 premios' });
  }
  const clean = prizes.map(p => p.trim()).filter(Boolean);
  await supabase.from('rankings_cache').upsert({ type: KEY, data: clean, total: clean.length, updated_at: new Date().toISOString() });
  res.json({ ok: true, prizes: clean });
});

module.exports = router;
