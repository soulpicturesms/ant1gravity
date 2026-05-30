const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

// ── In-memory room store (no Supabase needed) ─────────────────────────────────
const rooms = new Map();
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [k, v] of rooms) if (v.ts < cutoff) rooms.delete(k);
}, 10 * 60 * 1000);

function newId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ── Ball rack ─────────────────────────────────────────────────────────────────
function initialBalls() {
  const BALL_R = 11;
  const FW = 808, FH = 380;
  const rx = FW * 0.70, ry = FH / 2;
  const dRow = BALL_R * 2 * Math.cos(Math.PI / 6);
  const dCol = BALL_R * 2;

  const balls = [{ id: 0, x: FW * 0.25, y: ry, pocketed: false }];

  const slots = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col <= row; col++)
      slots.push({ x: rx + row * dRow, y: ry - row * BALL_R + col * dCol });

  const others = [1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  // 8-ball in center of 3-ball row (slot index 4)
  const ids = [...others.slice(0,4), 8, ...others.slice(4)];
  slots.forEach((s, i) => balls.push({ id: ids[i], x: s.x, y: s.y, pocketed: false }));
  return balls;
}

function freshState(name, mode, firstUser) {
  const maxPlayers = mode === '2v2' ? 4 : 2;
  return {
    phase: 'waiting', mode, maxPlayers, name,
    players: [{ userId: firstUser.id, username: firstUser.username, team: 0 }],
    teams: [
      { playerIds: [firstUser.id], group: null, pocketed: [] },
      { playerIds: [],             group: null, pocketed: [] },
    ],
    currentTeam: 0, currentPlayerInTeam: 0,
    balls: initialBalls(),
    groupAssigned: false,
    cueBallInHand: false,
    winner: null,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/rooms', requireAuth, (req, res) => {
  const list = [...rooms.entries()].map(([id, r]) => ({ id, name: r.state.name, state: r.state }));
  res.json(list);
});

router.post('/rooms', requireAuth, (req, res) => {
  const { name = 'Mesa Billar', mode = '1v1' } = req.body;
  const id    = newId();
  const state = freshState(name, mode, req.user);
  rooms.set(id, { state, ts: Date.now() });
  res.json({ id, state });
});

router.get('/rooms/:id', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json({ state: room.state });
});

router.post('/rooms/:id/join', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const state = room.state;
  if (state.players.find(p => p.userId === req.user.id)) return res.json({ state });
  if (state.players.length >= state.maxPlayers) return res.status(400).json({ error: 'Sala llena' });
  if (state.phase !== 'waiting') return res.status(400).json({ error: 'Partida en curso' });

  state.players.push({ userId: req.user.id, username: req.user.username, team: 1 });
  state.teams[1].playerIds.push(req.user.id);
  room.ts = Date.now();
  res.json({ state });
});

router.post('/rooms/:id/leave', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.json({ ok: true });
  const state = room.state;
  state.players = state.players.filter(p => p.userId !== req.user.id);
  state.teams.forEach(t => { t.playerIds = t.playerIds.filter(id => id !== req.user.id); });
  if (state.players.length === 0) rooms.delete(req.params.id);
  else room.ts = Date.now();
  res.json({ ok: true });
});

router.post('/rooms/:id/start', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const state = room.state;
  if (state.players.length < 2) return res.status(400).json({ error: 'Mínimo 2 jugadores' });
  Object.assign(state, {
    phase: 'playing', balls: initialBalls(),
    groupAssigned: false, currentTeam: 0, currentPlayerInTeam: 0,
    winner: null, cueBallInHand: false,
  });
  state.teams.forEach(t => { t.group = null; t.pocketed = []; });
  room.ts = Date.now();
  res.json({ state });
});

router.post('/rooms/:id/shot', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const state = room.state;
  if (state.phase !== 'playing') return res.status(400).json({ error: 'No se puede disparar ahora' });

  const team       = state.teams[state.currentTeam];
  const curId      = team.playerIds[state.currentPlayerInTeam % Math.max(1, team.playerIds.length)];
  if (curId !== req.user.id) return res.status(400).json({ error: 'No es tu turno' });

  const { balls, pocketedThisShot = [], foulCueBall = false } = req.body;
  if (Array.isArray(balls)) state.balls = balls.map(b => ({ ...b }));
  state.cueBallInHand = foulCueBall;

  // Group assignment on first pocket
  if (!state.groupAssigned) {
    const first = pocketedThisShot.find(id => id !== 0 && id !== 8);
    if (first != null) {
      state.groupAssigned = true;
      const isSolid = first <= 7;
      state.teams[state.currentTeam].group    = isSolid ? 'solids'  : 'stripes';
      state.teams[1 - state.currentTeam].group = isSolid ? 'stripes' : 'solids';
    }
  }

  const myGroup  = team.group;
  const oppTeam  = state.teams[1 - state.currentTeam];
  let validPocketed = 0;

  for (const id of pocketedThisShot) {
    if (id === 0) continue;
    if (id === 8) {
      // Check if player cleared their group
      const remaining = state.balls.filter(b => !b.pocketed && (myGroup === 'solids' ? b.id >= 1 && b.id <= 7 : b.id >= 9 && b.id <= 15));
      if (myGroup && remaining.length === 0 && !foulCueBall) {
        state.winner = state.currentTeam;
      } else {
        state.winner = 1 - state.currentTeam; // potted 8 early = lose
      }
      state.phase = 'game_end';
      break;
    } else {
      const isMine = myGroup === 'solids' ? id <= 7 : id >= 9;
      if (isMine || !myGroup) { team.pocketed.push(id); validPocketed++; }
      else                     { oppTeam.pocketed.push(id); }
    }
  }

  if (state.phase !== 'game_end') {
    const keepTurn = validPocketed > 0 && !foulCueBall;
    if (!keepTurn) {
      state.currentTeam = 1 - state.currentTeam;
      state.currentPlayerInTeam = (state.currentPlayerInTeam + 1) % Math.max(1, state.teams[state.currentTeam].playerIds.length);
    }
  }

  room.ts = Date.now();
  res.json({ state });
});

router.post('/rooms/:id/place-cue', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const { x, y } = req.body;
  const cb = room.state.balls.find(b => b.id === 0);
  if (cb) { cb.x = x; cb.y = y; cb.pocketed = false; }
  room.state.cueBallInHand = false;
  room.ts = Date.now();
  res.json({ state: room.state });
});

router.post('/rooms/:id/rematch', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  const state = room.state;
  Object.assign(state, {
    phase: 'playing', balls: initialBalls(),
    groupAssigned: false,
    currentTeam: typeof state.winner === 'number' ? 1 - state.winner : 0,
    currentPlayerInTeam: 0,
    winner: null, cueBallInHand: false,
  });
  state.teams.forEach(t => { t.group = null; t.pocketed = []; });
  room.ts = Date.now();
  res.json({ state });
});

module.exports = router;
