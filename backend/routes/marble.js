const express = require('express');
const { supabase } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET current active session + participants
router.get('/current', async (req, res) => {
  const { data: session } = await supabase
    .from('marble_sessions')
    .select('*')
    .or('status.eq.waiting,status.eq.racing')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return res.json({ status: 'none' });

  const { data: participants } = await supabase
    .from('marble_participants')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  res.json({ ...session, participants: participants || [] });
});

// POST join — public (for Twitch viewers)
router.post('/join', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  const { data: session } = await supabase
    .from('marble_sessions')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return res.status(400).json({ error: 'No hay carrera activa. Esperá al admin.' });

  const { count } = await supabase
    .from('marble_participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id);

  if (count >= 50) return res.status(400).json({ error: 'La carrera está llena (máx 50)' });

  const { data: existing } = await supabase
    .from('marble_participants')
    .select('id')
    .eq('session_id', session.id)
    .ilike('name', name.trim())
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Ese nombre ya está inscripto' });

  const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bcd','#ff9f43','#00d2d3','#a29bfe','#fd79a8','#55efc4','#74b9ff','#e17055'];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  await supabase.from('marble_participants').insert({ session_id: session.id, name: name.trim(), color });
  res.json({ ok: true, color });
});

// POST create new session (admin)
router.post('/create', requireAdmin, async (req, res) => {
  await supabase.from('marble_sessions')
    .update({ status: 'cancelled' })
    .or('status.eq.waiting,status.eq.racing');

  const { data: session, error } = await supabase
    .from('marble_sessions')
    .insert({ status: 'waiting' })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(session);
});

// POST start race (admin)
router.post('/start', requireAdmin, async (req, res) => {
  const { data: session } = await supabase
    .from('marble_sessions')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return res.status(400).json({ error: 'No hay sesión esperando' });

  const { data: participants } = await supabase
    .from('marble_participants')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  if (!participants?.length) return res.status(400).json({ error: 'No hay participantes' });

  const seed = Date.now();
  const winnerIdx = seed % participants.length;
  const winner = participants[winnerIdx];

  await supabase.from('marble_sessions').update({
    status: 'racing',
    seed: seed.toString(),
    started_at: new Date().toISOString(),
    winner_name: winner.name,
    winner_color: winner.color,
  }).eq('id', session.id);

  res.json({ ok: true });
});

// POST reset (admin)
router.post('/reset', requireAdmin, async (req, res) => {
  await supabase.from('marble_sessions')
    .update({ status: 'finished' })
    .or('status.eq.waiting,status.eq.racing');
  res.json({ ok: true });
});

module.exports = router;
