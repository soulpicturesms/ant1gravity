const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

async function autoFinish(g) {
  if (g.status === 'active' && new Date() >= new Date(g.ends_at)) {
    const participants = g.participants || [];
    const prizes = g.prizes || [];
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const winners = prizes.map((prize, i) => shuffled[i] ? { ...shuffled[i], prize } : null).filter(Boolean);
    await supabase.from('giveaways').update({ status: 'finished', winners }).eq('id', g.id);
    return { ...g, status: 'finished', winners };
  }
  return g;
}

router.post('/:id/close', requireAuth, async (req, res) => {
  const { data: g } = await supabase.from('giveaways').select('*').eq('id', req.params.id).maybeSingle();
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  const isAdminOrOfficer = req.user.role === 'admin' || req.user.role === 'officer';
  const isCreator = g.created_by === req.user.id;
  if (!isAdminOrOfficer && !isCreator) return res.status(403).json({ error: 'No tenés permiso' });
  await supabase.from('giveaways').update({ status: 'closed' }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.get('/current', async (req, res) => {
  const { data } = await supabase.from('giveaways').select('*').in('status', ['waiting','active','finished']).order('created_at', { ascending: false }).limit(1);
  if (!data || !data.length) return res.json(null);
  const g = await autoFinish(data[0]);
  res.json(g);
});

router.post('/', requireAuth, async (req, res) => {
  const { title, prizes, duration } = req.body;
  if (!title || !prizes || !prizes.length) return res.status(400).json({ error: 'Faltan datos' });
  const { count } = await supabase.from('giveaways').select('*', { count: 'exact', head: true }).in('status', ['waiting','active']);
  if ((count || 0) >= 3) return res.status(400).json({ error: 'Máximo 3 sorteos activos al mismo tiempo. Esperá que finalice alguno.' });
  const dur = Math.max(10, parseInt(duration) || 60);
  const now = new Date();
  const endsAt = new Date(now.getTime() + dur * 1000);
  const { data, error } = await supabase.from('giveaways').insert({
    title, prizes: Array.isArray(prizes) ? prizes : [prizes],
    duration: dur, status: 'active', participants: [], winners: [],
    created_by: req.user.id, created_by_name: req.user.username,
    started_at: now.toISOString(), ends_at: endsAt.toISOString(),
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:id/start', requireAdmin, async (req, res) => {
  const { data: g } = await supabase.from('giveaways').select('*').eq('id', req.params.id).maybeSingle();
  if (!g || g.status !== 'waiting') return res.status(400).json({ error: 'No se puede iniciar' });
  const now = new Date();
  const endsAt = new Date(now.getTime() + g.duration * 1000);
  await supabase.from('giveaways').update({ status: 'active', started_at: now.toISOString(), ends_at: endsAt.toISOString() }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { data: g } = await supabase.from('giveaways').select('*').eq('id', req.params.id).maybeSingle();
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  const isAdminOrOfficer = req.user.role === 'admin' || req.user.role === 'officer';
  const isCreator = g.created_by === req.user.id;
  if (!isAdminOrOfficer && !isCreator) return res.status(403).json({ error: 'No tenés permiso para cancelar este sorteo' });
  await supabase.from('giveaways').update({ status: 'cancelled' }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.post('/:id/join', requireAuth, async (req, res) => {
  const { data: g } = await supabase.from('giveaways').select('*').eq('id', req.params.id).maybeSingle();
  if (!g) return res.status(404).json({ error: 'No encontrado' });
  if (g.status !== 'active' && g.status !== 'waiting') return res.status(400).json({ error: 'El sorteo no está activo' });
  const participants = g.participants || [];
  if (participants.some(p => p.id === req.user.id)) return res.status(400).json({ error: 'Ya estás inscrito' });
  participants.push({ id: req.user.id, username: req.user.username });
  await supabase.from('giveaways').update({ participants }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.get('/list', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('giveaways').select('*').order('created_at', { ascending: false }).limit(20);
  res.json(data || []);
});

module.exports = router;
