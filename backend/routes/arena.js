const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const COLORS = [
  '#ff4444','#44ff88','#4488ff','#ffdd44','#ff44cc','#44ffee',
  '#ff8844','#88ff44','#ff44ff','#44ccff','#ffcc44','#cc44ff',
];

function adminMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'admin' && user.role !== 'officer') return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/current', async (req, res) => {
  const type = req.query.type || 'coliseo';
  const { data: sessions, error } = await supabase
    .from('marble_sessions')
    .select('*')
    .eq('game_type', type)
    .in('status', ['waiting', 'racing'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!sessions?.length) return res.json({ session: null, participants: [] });

  const session = sessions[0];
  const { data: parts } = await supabase
    .from('marble_participants')
    .select('name, color, created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  res.json({ session, participants: parts || [] });
});

router.post('/join', async (req, res) => {
  const { name, type = 'coliseo' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

  const { data: sessions } = await supabase
    .from('marble_sessions')
    .select('id')
    .eq('game_type', type)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!sessions?.length) return res.status(400).json({ error: 'No hay sesión activa' });
  const sessionId = sessions[0].id;

  const { data: existing } = await supabase
    .from('marble_participants')
    .select('id')
    .eq('session_id', sessionId)
    .ilike('name', name.trim());
  if (existing?.length) return res.status(400).json({ error: 'Ese nombre ya está registrado' });

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const { data, error } = await supabase
    .from('marble_participants')
    .insert({ session_id: sessionId, name: name.trim(), color })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ participant: data });
});

router.post('/create', adminMiddleware, async (req, res) => {
  const { type = 'coliseo' } = req.body;
  await supabase
    .from('marble_sessions')
    .update({ status: 'finished' })
    .eq('game_type', type)
    .in('status', ['waiting', 'racing']);

  const { data, error } = await supabase
    .from('marble_sessions')
    .insert({ status: 'waiting', game_type: type })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ session: data });
});

router.post('/start', adminMiddleware, async (req, res) => {
  const { type = 'coliseo' } = req.body;

  const { data: sessions } = await supabase
    .from('marble_sessions')
    .select('*')
    .eq('game_type', type)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!sessions?.length) return res.status(400).json({ error: 'No hay sesión en espera' });
  const session = sessions[0];

  const { data: parts } = await supabase
    .from('marble_participants')
    .select('name, color')
    .eq('session_id', session.id);

  if (!parts?.length) return res.status(400).json({ error: 'No hay participantes' });

  const seed = Date.now().toString();
  const winnerIdx = parseInt(seed) % parts.length;
  const winner = parts[winnerIdx];

  const { data, error } = await supabase
    .from('marble_sessions')
    .update({
      status: 'racing',
      seed,
      started_at: new Date().toISOString(),
      winner_name: winner.name,
      winner_color: winner.color,
    })
    .eq('id', session.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ session: data });
});

router.post('/reset', adminMiddleware, async (req, res) => {
  const { type = 'coliseo' } = req.body;
  await supabase
    .from('marble_sessions')
    .update({ status: 'finished' })
    .eq('game_type', type)
    .in('status', ['waiting', 'racing']);
  res.json({ ok: true });
});

module.exports = router;
