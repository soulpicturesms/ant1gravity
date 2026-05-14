const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ── DEATH-BASED REEQUIP (killboard integration) ─────────────────────────────

const AMERICAS_CITIES = 'Bridgewatch,Martlock,Thetford,Lymhurst,FortSterling,BlackMarket';

router.get('/prices', requireAuth, async (req, res) => {
  const { items } = req.query;
  if (!items) return res.status(400).json({ error: 'Se requieren items' });
  try {
    const r = await fetch(`https://albion-online-data.com/api/v2/stats/prices/${items}.json?locations=${AMERICAS_CITIES}`);
    if (!r.ok) throw new Error(`Albion Data API ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/death-request', requireAuth, async (req, res) => {
  const { event_id, death_event } = req.body;
  if (!event_id || !death_event) return res.status(400).json({ error: 'Faltan datos' });

  const { data: existing } = await supabase.from('reequip_requests').select('id').eq('event_id', event_id).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Ya existe una solicitud para esta muerte' });

  const { data: user } = await supabase.from('users').select('username,albion_character').eq('id', req.user.id).maybeSingle();
  const { data, error } = await supabase.from('reequip_requests').insert({
    user_id: req.user.id, username: user?.username,
    albion_character: user?.albion_character,
    event_id: parseInt(event_id), death_event,
    status: 'pending', claimed: false,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.get('/my-death-requests', requireAuth, async (req, res) => {
  const { data } = await supabase.from('reequip_requests')
    .select('id,status,silver_total,coins_awarded,selected_items,albion_character,created_at,reviewed_at,admin_notes,claimed,event_id,death_event')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

router.post('/death-request/:id/claim', requireAuth, async (req, res) => {
  const { data: rq } = await supabase.from('reequip_requests').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (!rq) return res.status(404).json({ error: 'No encontrado' });
  if (rq.status !== 'approved') return res.status(400).json({ error: 'No aprobado aún' });
  if (rq.claimed) return res.status(400).json({ error: 'Ya reclamado' });
  await supabase.from('reequip_requests').update({ claimed: true }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.get('/admin/death-requests', requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('reequip_requests').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query;
  res.json(data || []);
});

router.post('/admin/death-requests/:id/approve', requireAdmin, async (req, res) => {
  const { selected_items, admin_notes } = req.body;
  const { data: rq } = await supabase.from('reequip_requests').select('*').eq('id', req.params.id).maybeSingle();
  if (!rq) return res.status(404).json({ error: 'No encontrado' });

  const silver_total = (selected_items || []).reduce((s, i) => s + (i.silver || 0), 0);
  const coins_awarded = silver_total;

  await supabase.from('reequip_requests').update({
    status: 'approved', selected_items, silver_total, coins_awarded,
    admin_id: req.user.id, admin_notes: admin_notes || null,
    reviewed_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  const { data: u } = await supabase.from('users').select('coins').eq('id', rq.user_id).maybeSingle();
  await supabase.from('users').update({ coins: (u?.coins || 0) + coins_awarded }).eq('id', rq.user_id);
  await supabase.from('coin_transactions').insert({
    user_id: rq.user_id, username: rq.username, amount: coins_awarded,
    type: 'reequip', reason: `Reequipo killboard — ${(selected_items || []).length} items (${rq.albion_character})`,
    admin_id: req.user.id,
  });

  res.json({ ok: true, coins_awarded });
});

router.post('/admin/death-requests/:id/reject', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  const { data: rq } = await supabase.from('reequip_requests').select('id').eq('id', req.params.id).maybeSingle();
  if (!rq) return res.status(404).json({ error: 'No encontrado' });
  await supabase.from('reequip_requests').update({
    status: 'rejected', admin_id: req.user.id,
    admin_notes: admin_notes || null, reviewed_at: new Date().toISOString(),
  }).eq('id', req.params.id);
  res.json({ ok: true });
});

router.get('/admin/death-stats', requireAdmin, async (req, res) => {
  const { data: requests } = await supabase.from('reequip_requests')
    .select('status,silver_total,coins_awarded,username,created_at')
    .order('created_at', { ascending: false });

  const all = requests || [];
  const approved = all.filter(r => r.status === 'approved');
  const totalSilver = approved.reduce((s, r) => s + (r.silver_total || 0), 0);

  const byUser = {};
  for (const r of approved) {
    if (!byUser[r.username]) byUser[r.username] = { username: r.username, total_silver: 0, count: 0 };
    byUser[r.username].total_silver += r.silver_total || 0;
    byUser[r.username].count++;
  }
  const topUsers = Object.values(byUser).sort((a, b) => b.total_silver - a.total_silver).slice(0, 10);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const byDay = {};
  for (const r of approved.filter(r => new Date(r.created_at) >= since)) {
    const day = r.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, silver: 0, count: 0 };
    byDay[day].silver += r.silver_total || 0;
    byDay[day].count++;
  }
  const timeline = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

  res.json({ totalSilver, counts, topUsers, timeline });
});

module.exports = router;
