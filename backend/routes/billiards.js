const express = require('express');
const router  = express.Router();
const { supabase }    = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const newId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const BET_OPTIONS = [0, 100, 500, 1000, 5000, 10000];
const HOUSE_RAKE  = 0.05;

// ── Helpers ──────────────────────────────────────────────────────────────────
function publicRoom(row) {
  return {
    id: row.id, name: row.name, mode: row.mode, bet: row.bet,
    maxPlayers: row.max_players, status: row.status,
    players: (row.players || []).map(p => ({
      userId: p.userId, username: p.username, team: p.team,
    })),
    pot: row.pot,
    winnerName: row.winner_name || null,
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

async function getRoom(id) {
  const { data, error } = await supabase.from('billiards_rooms').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function saveRoom(id, patch) {
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from('billiards_rooms').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

// Lazy cleanup of stale rooms (>2h). Runs occasionally per request.
let lastCleanup = 0;
async function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  const cutoff = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  await supabase.from('billiards_rooms').delete().lt('updated_at', cutoff);
}

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/rooms', requireAuth, async (_req, res) => {
  try {
    await maybeCleanup();
    const { data, error } = await supabase
      .from('billiards_rooms')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(40);
    if (error) throw error;
    res.json((data || []).map(publicRoom));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/bet-options', requireAuth, (_req, res) => res.json(BET_OPTIONS));

router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { name = 'Mesa Billar', mode = '1v1', bet = 0 } = req.body;
    if (!['1v1', '2v2'].includes(mode))     return res.status(400).json({ error: 'Modo inválido' });
    if (!BET_OPTIONS.includes(Number(bet))) return res.status(400).json({ error: 'Apuesta inválida' });

    const id = newId();
    const esc = await escrowBet(req.user.id, Number(bet), id, mode);
    if (!esc.ok) return res.status(400).json({ error: esc.error });

    const maxPlayers = mode === '2v2' ? 4 : 2;
    const players = [{
      userId: req.user.id,
      username: esc.username || req.user.username,
      team: 0, refunded: false,
    }];

    const { data, error } = await supabase.from('billiards_rooms').insert({
      id, name: String(name).slice(0, 30), mode,
      bet: Number(bet), max_players: maxPlayers,
      status: 'waiting', pot: Number(bet),
      players, winner_name: null, result_reported: false,
      created_by: req.user.id,
    }).select().single();
    if (error) throw error;
    res.json(publicRoom(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    res.json(publicRoom(room));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Partida en curso' });

    const players = room.players || [];
    if (players.find(p => p.userId === req.user.id)) return res.json(publicRoom(room));
    if (players.length >= room.max_players)         return res.status(400).json({ error: 'Sala llena' });

    const esc = await escrowBet(req.user.id, room.bet, room.id, room.mode);
    if (!esc.ok) return res.status(400).json({ error: esc.error });

    const team = room.mode === '2v2' ? [0, 1, 0, 1][players.length] : players.length;
    players.push({
      userId: req.user.id,
      username: esc.username || req.user.username,
      team, refunded: false,
    });
    const newPot = room.pot + room.bet;
    const filled = players.length >= room.max_players;

    await saveRoom(room.id, {
      players,
      pot: newPot,
      status: filled ? 'playing' : 'waiting',
    });

    const updated = await getRoom(room.id);
    res.json(publicRoom(updated));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.json({ ok: true });
    const players = room.players || [];
    const player = players.find(p => p.userId === req.user.id);
    if (!player) return res.json({ ok: true });

    if (room.status === 'waiting') {
      if (room.bet > 0 && !player.refunded) {
        await payout(player.userId, player.username, room.bet, room.id, room.mode, false);
        player.refunded = true;
      }
      const remaining = players.filter(p => p.userId !== req.user.id);
      if (remaining.length === 0) {
        await supabase.from('billiards_rooms').delete().eq('id', room.id);
      } else {
        await saveRoom(room.id, { players: remaining, pot: Math.max(0, room.pot - room.bet) });
      }
      return res.json({ ok: true });
    }

    if (room.status === 'playing' && !room.result_reported) {
      // Walk-out = forfeit. Opponent team wins the pot.
      const winningTeam = 1 - player.team;
      const winners = players.filter(p => p.team === winningTeam);
      if (winners.length) {
        const totalPot = room.pot;
        const rake = Math.floor(totalPot * HOUSE_RAKE);
        const winnings = totalPot - rake;
        const perWinner = Math.floor(winnings / winners.length);
        for (const w of winners) {
          await payout(w.userId, w.username, perWinner, room.id, room.mode, true);
        }
        await saveRoom(room.id, {
          status: 'finished',
          result_reported: true,
          winner_name: winners.map(w => w.username).join(', ') + ' (oponente abandonó)',
        });
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/result', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    if (room.status !== 'playing') return res.json({ ok: true, alreadyFinished: true });

    const players = room.players || [];
    if (!players.find(p => p.userId === req.user.id))
      return res.status(403).json({ error: 'No estás en esta sala' });
    if (room.result_reported) return res.json({ ok: true, alreadyFinished: true });

    const { winnerUsername } = req.body;
    const winner = players.find(p => p.username === winnerUsername);
    if (!winner) return res.status(400).json({ error: 'Ganador inválido' });

    const winningTeam = winner.team;
    const winners = players.filter(p => p.team === winningTeam);

    if (room.pot > 0 && winners.length > 0) {
      const rake = Math.floor(room.pot * HOUSE_RAKE);
      const winnings = room.pot - rake;
      const perWinner = Math.floor(winnings / winners.length);
      for (const w of winners) {
        await payout(w.userId, w.username, perWinner, room.id, room.mode, true);
      }
    }

    await saveRoom(room.id, {
      status: 'finished',
      result_reported: true,
      winner_name: winners.map(w => w.username).join(' & '),
    });
    res.json({ ok: true, winners: winners.map(w => w.username), pot: room.pot });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
