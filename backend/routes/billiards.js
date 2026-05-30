const express = require('express');
const router  = express.Router();
const { supabase }    = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// ── In-memory rooms (cleaned every 10 min, dropped after 2h idle) ────────────
const rooms = new Map();
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, r] of rooms) if (r.ts < cutoff) rooms.delete(id);
}, 10 * 60 * 1000);

const newId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const BET_OPTIONS = [0, 100, 500, 1000, 5000, 10000];   // valid bet amounts
const HOUSE_RAKE  = 0.05;                                // 5% rake on pots > 0

function publicRoom(room) {
  return {
    id: room.id, name: room.name, mode: room.mode, bet: room.bet,
    maxPlayers: room.maxPlayers, status: room.status,
    players: room.players.map(p => ({ userId:p.userId, username:p.username, team:p.team })),
    pot: room.pot, winnerName: room.winnerName || null,
  };
}

async function escrowBet(userId, amount, roomId, mode) {
  if (amount <= 0) return { ok: true, username: null };
  const { data: user } = await supabase.from('users').select('coins,username').eq('id', userId).maybeSingle();
  if (!user) return { ok: false, error: 'Usuario no encontrado' };
  if (user.coins < amount) return { ok: false, error: 'Tokens insuficientes' };
  await supabase.from('users').update({ coins: user.coins - amount }).eq('id', userId);
  await supabase.from('coin_transactions').insert({
    user_id: userId, username: user.username,
    amount: -amount, type: 'casino',
    reason: `Billar ${mode} — apuesta sala ${roomId}`,
  });
  return { ok: true, username: user.username };
}

async function payout(userId, username, amount, roomId, mode, isWin) {
  if (amount <= 0) return;
  const { data: user } = await supabase.from('users').select('coins').eq('id', userId).maybeSingle();
  const cur = user?.coins ?? 0;
  await supabase.from('users').update({ coins: cur + amount }).eq('id', userId);
  await supabase.from('coin_transactions').insert({
    user_id: userId, username,
    amount, type: 'casino',
    reason: `Billar ${mode} — ${isWin ? 'Ganador' : 'Reembolso'} sala ${roomId}`,
  });
}

async function refundAll(room) {
  for (const p of room.players) {
    if (p.refunded) continue;
    await payout(p.userId, p.username, room.bet, room.id, room.mode, false);
    p.refunded = true;
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/rooms', requireAuth, (req, res) => {
  const list = [...rooms.values()].map(publicRoom);
  res.json(list);
});

router.get('/bet-options', requireAuth, (_req, res) => res.json(BET_OPTIONS));

router.post('/rooms', requireAuth, async (req, res) => {
  const { name = 'Mesa Billar', mode = '1v1', bet = 0 } = req.body;
  if (!['1v1', '2v2'].includes(mode))       return res.status(400).json({ error: 'Modo inválido' });
  if (!BET_OPTIONS.includes(Number(bet)))   return res.status(400).json({ error: 'Apuesta inválida' });

  const esc = await escrowBet(req.user.id, Number(bet), 'NEW', mode);
  if (!esc.ok) return res.status(400).json({ error: esc.error });

  const id = newId();
  const maxPlayers = mode === '2v2' ? 4 : 2;
  const room = {
    id, ts: Date.now(),
    name: String(name).slice(0, 30), mode, bet: Number(bet), maxPlayers,
    status: 'waiting',
    players: [{
      userId: req.user.id, username: esc.username || req.user.username,
      team: 0, refunded: false,
    }],
    pot: Number(bet),
    winnerName: null, resultReported: false,
    createdBy: req.user.id,
  };
  rooms.set(id, room);
  res.json(publicRoom(room));
});

router.get('/rooms/:id', requireAuth, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(publicRoom(room));
});

router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  if (room.status !== 'waiting')       return res.status(400).json({ error: 'Partida en curso' });
  if (room.players.find(p => p.userId === req.user.id)) return res.json(publicRoom(room));
  if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Sala llena' });

  const esc = await escrowBet(req.user.id, room.bet, room.id, room.mode);
  if (!esc.ok) return res.status(400).json({ error: esc.error });

  // Team assignment: 1v1 → [0,1], 2v2 → [0,1,0,1] (seats alternate teams)
  const team = room.mode === '2v2' ? [0, 1, 0, 1][room.players.length] : room.players.length;
  room.players.push({
    userId: req.user.id, username: esc.username || req.user.username,
    team, refunded: false,
  });
  room.pot += room.bet;
  room.ts = Date.now();

  // Auto-start when full
  if (room.players.length >= room.maxPlayers) {
    room.status = 'playing';
    room.startedAt = Date.now();
  }
  res.json(publicRoom(room));
});

router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.json({ ok: true });
  const player = room.players.find(p => p.userId === req.user.id);
  if (!player) return res.json({ ok: true });

  if (room.status === 'waiting') {
    // Refund the leaver, remove them from the room
    if (room.bet > 0 && !player.refunded) {
      await payout(player.userId, player.username, room.bet, room.id, room.mode, false);
      player.refunded = true;
    }
    room.players = room.players.filter(p => p.userId !== req.user.id);
    room.pot = Math.max(0, room.pot - room.bet);
    if (room.players.length === 0) rooms.delete(req.params.id);
    return res.json({ ok: true });
  }

  if (room.status === 'playing') {
    // Walk-out: forfeit. Opponent team(s) win the pot.
    const winningTeam = 1 - player.team;
    const winners = room.players.filter(p => p.team === winningTeam);
    const losers  = room.players.filter(p => p.team === player.team);
    if (!room.resultReported && winners.length) {
      room.resultReported = true;
      const totalPot = room.pot;
      const rake = Math.floor(totalPot * HOUSE_RAKE);
      const winnings = totalPot - rake;
      const perWinner = Math.floor(winnings / winners.length);
      for (const w of winners) {
        await payout(w.userId, w.username, perWinner, room.id, room.mode, true);
      }
      room.status = 'finished';
      room.winnerName = winners.map(w => w.username).join(', ') + ' (oponente abandonó)';
      // Mark losers (they don't get anything)
      losers.forEach(l => { l.refunded = true; });
    }
    return res.json({ ok: true });
  }

  res.json({ ok: true });
});

// Result is reported by the iframe (one of the players) once the game ends.
// We accept the first valid result; subsequent calls are ignored.
router.post('/rooms/:id/result', requireAuth, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  if (room.status !== 'playing') return res.json({ ok: true, alreadyFinished: true });
  if (!room.players.find(p => p.userId === req.user.id))
    return res.status(403).json({ error: 'No estás en esta sala' });
  if (room.resultReported) return res.json({ ok: true, alreadyFinished: true });

  const { winnerUsername } = req.body;
  const winner = room.players.find(p => p.username === winnerUsername);
  if (!winner) return res.status(400).json({ error: 'Ganador inválido' });

  room.resultReported = true;
  const winningTeam = winner.team;
  const winners = room.players.filter(p => p.team === winningTeam);

  if (room.pot > 0 && winners.length > 0) {
    const rake = Math.floor(room.pot * HOUSE_RAKE);
    const winnings = room.pot - rake;
    const perWinner = Math.floor(winnings / winners.length);
    for (const w of winners) {
      await payout(w.userId, w.username, perWinner, room.id, room.mode, true);
    }
  }

  room.status = 'finished';
  room.winnerName = winners.map(w => w.username).join(' & ');
  res.json({ ok: true, winners: winners.map(w => w.username), pot: room.pot });
});

module.exports = router;
