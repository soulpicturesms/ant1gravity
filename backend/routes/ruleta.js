const express = require('express');
const { supabase } = require('../supabase');
const { requireStrictAdmin } = require('../middleware/auth');
const router = express.Router();

const KEY = 'ruleta_prizes';

const DEFAULT_PRIZES = [
  { name: 'Blindado T7', weight: 0.5 },
  { name: 'Buey T8', weight: 0.33 },
  { name: 'Gallardo', weight: 0.33 },
  { name: 'Husky', weight: 0.33 },
  { name: 'Garrapresta', weight: 1.05 },
  { name: 'Mula', weight: 1.05 },
  { name: 'Buey T7', weight: 0.5 },
  { name: 'Blindado T8', weight: 0.33 },
  { name: 'Blindado T6', weight: 1.10 },
  { name: 'Lagarto de Pantano T7 Común', weight: 1.05 },
  { name: 'Mula de Combate', weight: 1.07 },
  { name: 'Carnero de Hielo', weight: 0.5 },
  { name: 'Cimarrón de Martlok', weight: 1.0 },
  { name: 'Ave de Terror', weight: 0.5 },
  { name: 'SEGUI PARTICIPANDO', weight: 1.5 },
  { name: 'VALE POR OTRO TIRO', weight: 1.5 },
];

// Backwards compat: older saved data may be a plain array of strings
function normalizePrizes(list) {
  if (!Array.isArray(list)) return null;
  return list.map(p => (typeof p === 'string' ? { name: p, weight: 1 } : { name: p?.name, weight: Number(p?.weight) || 1 }));
}

router.get('/prizes', async (req, res) => {
  const { data } = await supabase.from('rankings_cache').select('data').eq('type', KEY).maybeSingle();
  res.json(normalizePrizes(data?.data) || DEFAULT_PRIZES);
});

router.put('/prizes', requireStrictAdmin, async (req, res) => {
  const { prizes } = req.body;
  if (!Array.isArray(prizes) || prizes.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 premios' });
  }
  const clean = prizes
    .map(p => ({ name: (typeof p === 'string' ? p : p?.name || '').trim(), weight: Math.max(0.01, Number(typeof p === 'string' ? 1 : p?.weight) || 1) }))
    .filter(p => p.name);
  if (clean.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 premios' });
  }
  await supabase.from('rankings_cache').upsert({ type: KEY, data: clean, total: clean.length, updated_at: new Date().toISOString() });
  res.json({ ok: true, prizes: clean });
});

module.exports = router;
