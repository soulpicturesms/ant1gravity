const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// List events (public)
router.get('/', async (req, res) => {
  const { data } = await supabase.from('bet_events')
    .select('*').order('created_at', { ascending: false }).limit(30);
  res.json(data || []);
});

// Single event detail with entries
router.get('/:id', requireAuth, async (req, res) => {
  const { data: event } = await supabase.from('bet_events').select('*').eq('id', req.params.id).maybeSingle();
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const { data: entries } = await supabase.from('bet_entries').select('*').eq('event_id', req.params.id);

  const totals = {};
  for (const opt of event.options) {
    totals[opt.id] = (entries || []).filter(e => e.option_id === opt.id).reduce((s, e) => s + e.amount, 0);
  }
  const totalPot = (entries || []).reduce((s, e) => s + e.amount, 0);
  const myEntry = (entries || []).find(e => e.user_id === req.user.id) || null;

  res.json({ ...event, entries: entries || [], totals, totalPot, myEntry });
});

// Admin: create event
router.post('/', requireAdmin, async (req, res) => {
  const { title, description, options } = req.body;
  if (!title || !options || options.length < 2)
    return res.status(400).json({ error: 'Se necesita título y al menos 2 opciones' });

  const formattedOptions = options.map((opt, i) => ({
    id: `opt_${i}`,
    label: typeof opt === 'string' ? opt : opt.label,
  }));

  const { data, error } = await supabase.from('bet_events').insert({
    title, description: description || null, options: formattedOptions,
    status: 'open', created_by: req.user.id,
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin: lock (no more bets)
router.post('/:id/lock', requireAdmin, async (req, res) => {
  await supabase.from('bet_events').update({ status: 'locked', locked_at: new Date().toISOString() }).eq('id', req.params.id);
  res.json({ ok: true });
});

// Admin: resolve (pick winner, distribute pot)
router.post('/:id/resolve', requireAdmin, async (req, res) => {
  const { winning_option_id } = req.body;

  const { data: event } = await supabase.from('bet_events').select('*').eq('id', req.params.id).maybeSingle();
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  if (event.status === 'resolved') return res.status(400).json({ error: 'Ya resuelto' });

  const { data: entries } = await supabase.from('bet_entries').select('*').eq('event_id', req.params.id);
  const all = entries || [];
  const winners = all.filter(e => e.option_id === winning_option_id);
  const totalPot = all.reduce((s, e) => s + e.amount, 0);
  const winnerPool = winners.reduce((s, e) => s + e.amount, 0);

  for (const w of winners) {
    const share = winnerPool > 0 ? Math.floor((w.amount / winnerPool) * totalPot) : 0;
    const { data: u } = await supabase.from('users').select('coins').eq('id', w.user_id).maybeSingle();
    await supabase.from('users').update({ coins: (u?.coins || 0) + share }).eq('id', w.user_id);
    await supabase.from('bet_entries').update({ payout: share, won: true }).eq('id', w.id);
    await supabase.from('coin_transactions').insert({
      user_id: w.user_id, username: w.username, amount: share,
      type: 'bet_win', reason: `Ganó apuesta: ${event.title}`,
    });
  }

  const loserIds = all.filter(e => e.option_id !== winning_option_id).map(e => e.id);
  if (loserIds.length) await supabase.from('bet_entries').update({ payout: 0, won: false }).in('id', loserIds);

  await supabase.from('bet_events').update({
    status: 'resolved', winning_option_id, resolved_at: new Date().toISOString(),
  }).eq('id', req.params.id);

  res.json({ ok: true, total_pot: totalPot, winners: winners.length });
});

// Admin: cancel and refund
router.post('/:id/cancel', requireAdmin, async (req, res) => {
  const { data: entries } = await supabase.from('bet_entries').select('*').eq('event_id', req.params.id);
  for (const e of (entries || [])) {
    const { data: u } = await supabase.from('users').select('coins').eq('id', e.user_id).maybeSingle();
    await supabase.from('users').update({ coins: (u?.coins || 0) + e.amount }).eq('id', e.user_id);
    await supabase.from('coin_transactions').insert({
      user_id: e.user_id, username: e.username, amount: e.amount,
      type: 'bet_refund', reason: `Reembolso: ${req.body.reason || 'apuesta cancelada'}`,
    });
  }
  await supabase.from('bet_events').update({ status: 'cancelled' }).eq('id', req.params.id);
  res.json({ ok: true });
});

// User: place bet
router.post('/:id/bet', requireAuth, async (req, res) => {
  const { option_id, amount } = req.body;
  const amt = parseInt(amount);
  if (!option_id || !amt || amt <= 0) return res.status(400).json({ error: 'Datos inválidos' });

  const { data: event } = await supabase.from('bet_events').select('*').eq('id', req.params.id).maybeSingle();
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  if (event.status !== 'open') return res.status(400).json({ error: 'Las apuestas están cerradas' });
  if (!event.options.find(o => o.id === option_id)) return res.status(400).json({ error: 'Opción inválida' });

  const { data: existing } = await supabase.from('bet_entries').select('id').eq('event_id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Ya apostaste en este evento' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < amt) return res.status(400).json({ error: 'Tokens insuficientes' });

  await supabase.from('users').update({ coins: user.coins - amt }).eq('id', req.user.id);
  await supabase.from('bet_entries').insert({
    event_id: req.params.id, user_id: req.user.id, username: user.username,
    option_id, amount: amt,
  });
  await supabase.from('coin_transactions').insert({
    user_id: req.user.id, username: user.username, amount: -amt,
    type: 'bet', reason: `Apuesta: ${event.title}`,
  });

  res.json({ ok: true, new_balance: user.coins - amt });
});

module.exports = router;
