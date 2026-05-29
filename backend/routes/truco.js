const express = require('express');
const router  = express.Router();
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// ─── Game Logic ───────────────────────────────────────────────────────────────
const PALOS = ['Espadas', 'Bastos', 'Copas', 'Oros'];
const NUMS  = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

function trucoRank(num, palo) {
  if (num === 1 && palo === 'Espadas') return 14;
  if (num === 1 && palo === 'Bastos')  return 13;
  if (num === 7 && palo === 'Espadas') return 12;
  if (num === 7 && palo === 'Oros')    return 11;
  if (num === 3)  return 10;
  if (num === 2)  return 9;
  if (num === 1)  return 8;
  if (num === 12) return 7;
  if (num === 11) return 6;
  if (num === 10) return 5;
  if (num === 7)  return 4;
  if (num === 6)  return 3;
  if (num === 5)  return 2;
  if (num === 4)  return 1;
  return 0;
}

function envidoVal(num) { return num >= 10 ? 0 : num; }

function calcEnvido(cards) {
  let best = 0;
  for (const p of PALOS) {
    const same = cards.filter(c => c.palo === p);
    if (same.length >= 2) {
      same.sort((a, b) => envidoVal(b.num) - envidoVal(a.num));
      const pts = 20 + envidoVal(same[0].num) + envidoVal(same[1].num);
      if (pts > best) best = pts;
    } else if (same.length === 1) {
      const pts = envidoVal(same[0].num);
      if (pts > best) best = pts;
    }
  }
  return best;
}

function newMazo() {
  const d = [];
  for (const p of PALOS) for (const n of NUMS) d.push({ num: n, palo: p, id: `${n}${p[0]}` });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function teamOf(state, userId) {
  if (state.teams[0].includes(userId)) return 0;
  if (state.teams[1].includes(userId)) return 1;
  return -1;
}

function startHand(state, fullState) {
  const mazo = newMazo();
  const hands = {};
  for (const p of state.players) {
    hands[p.userId] = [mazo.pop(), mazo.pop(), mazo.pop()];
    p.remainingCards = 3;
    p.playedCards = [];
  }
  fullState.mazo  = mazo;
  fullState.hands = hands;

  state.trick          = [];
  state.trickHistory   = [];
  state.trickWins      = [0, 0];
  state.tricksCompleted = 0;
  state.trucoPts       = 1;
  state.trucoOffer     = null;
  state.trucoAccepted  = false;
  state.envidoOffer    = null;
  state.envidoSettled  = false;
  state.envidoResult   = null;
  state.handEndResult  = null;
  state.gameOver       = null;
  state.phase          = 'playing';
  state.status         = 'playing';
  state.currentUserId  = state.players[0].userId;
}

function resolveTrick(state) {
  const trick = state.trick;
  state.tricksCompleted = (state.tricksCompleted || 0) + 1;

  let bestRank = -1, bestUserId = null, tie = true;
  const firstRank = trucoRank(trick[0].card.num, trick[0].card.palo);

  for (const t of trick) {
    const r = trucoRank(t.card.num, t.card.palo);
    if (r !== firstRank) tie = false;
    if (r > bestRank) { bestRank = r; bestUserId = t.userId; }
  }

  const firstPlayerId = trick[0].userId;
  let winnerTeam;

  if (tie) {
    winnerTeam = teamOf(state, firstPlayerId);
  } else {
    winnerTeam = teamOf(state, bestUserId);
    state.trickWins[winnerTeam]++;
  }

  state.trickHistory = state.trickHistory || [];
  state.trickHistory.push({ trick: [...trick], winnerTeam, tie });
  state.trick = [];

  const handWinner = state.trickWins.findIndex(w => w >= 2);
  if (handWinner !== -1 || state.tricksCompleted >= 3) {
    let w;
    if (handWinner !== -1) {
      w = handWinner;
    } else if (state.trickWins[0] !== state.trickWins[1]) {
      w = state.trickWins[0] > state.trickWins[1] ? 0 : 1;
    } else {
      w = teamOf(state, state.players[0].userId);
    }
    endHand(state, w);
  } else {
    state.currentUserId = tie ? firstPlayerId : bestUserId;
  }
}

function endHand(state, winnerTeam) {
  const pts = state.trucoAccepted ? state.trucoPts : 1;
  state.scores[winnerTeam] += pts;
  state.handEndResult = { winnerTeam, trucoPoints: pts, scores: [...state.scores] };
  state.phase = 'hand_end';
  state.currentUserId = null;

  if (state.scores[0] >= 15 || state.scores[1] >= 15) {
    const champ = state.scores[0] >= 15 ? 0 : 1;
    state.gameOver = { winnerTeam: champ, scores: [...state.scores] };
    state.status = 'finished';
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function getRoom(id) {
  const { data, error } = await supabase
    .from('truco_rooms').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function saveRoom(id, state, fullState) {
  await supabase.from('truco_rooms').update({
    state, full_state: fullState, updated_at: new Date().toISOString(),
  }).eq('id', id);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('truco_rooms').select('id, state, updated_at')
      .order('updated_at', { ascending: false }).limit(30);

    const rooms = (data || [])
      .filter(r => r.state?.status === 'waiting' || r.state?.status === 'playing')
      .map(r => ({
        id: r.id,
        name: r.state?.name || 'Truco',
        mode: r.state?.mode || '1v1',
        maxPlayers: r.state?.maxPlayers || 2,
        playerCount: r.state?.players?.length || 0,
        status: r.state?.status || 'waiting',
      }));

    res.json(rooms);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { name, mode = '1v1' } = req.body;
    const maxPlayers = mode === '2v2' ? 4 : 2;
    const { id: userId, username } = req.user;
    const { data: user } = await supabase.from('users').select('albion_avatar, albion_ring').eq('id', userId).maybeSingle();

    const state = {
      name: name || `Sala de ${username}`,
      mode, maxPlayers,
      status: 'waiting', phase: 'waiting',
      players: [{ userId, username, albion_avatar: user?.albion_avatar || null, albion_ring: user?.albion_ring || null, team: 0, remainingCards: 0, playedCards: [] }],
      teams: [[userId], []],
      scores: [0, 0], trickWins: [0, 0], tricksCompleted: 0,
      trick: [], trickHistory: [],
      currentUserId: null,
      trucoPts: 1, trucoOffer: null, trucoAccepted: false,
      envidoOffer: null, envidoSettled: false, envidoResult: null,
      handEndResult: null, gameOver: null,
    };

    const { data, error } = await supabase
      .from('truco_rooms')
      .insert({ name: state.name, state, full_state: { mazo: [], hands: {} } })
      .select('id').single();

    if (error) throw error;
    res.json({ id: data.id, ...state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;
    const myCards   = fullState?.hands?.[userId] || [];
    const myEnvido  = myCards.length ? calcEnvido(myCards) : null;

    res.json({ ...state, id: room.id, myCards, myEnvido });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const { id: userId, username } = req.user;

    if (state.players.find(p => p.userId === userId)) {
      const myCards = fullState?.hands?.[userId] || [];
      return res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
    }
    if (state.players.length >= state.maxPlayers)
      return res.status(400).json({ error: 'Sala llena' });
    if (state.status !== 'waiting')
      return res.status(400).json({ error: 'La partida ya empezó' });

    const { data: user } = await supabase.from('users').select('albion_avatar, albion_ring').eq('id', userId).maybeSingle();
    const team = state.players.length % 2;
    state.players.push({ userId, username, albion_avatar: user?.albion_avatar || null, albion_ring: user?.albion_ring || null, team, remainingCards: 0, playedCards: [] });
    state.teams[team].push(userId);

    await saveRoom(room.id, state, fullState);
    res.json({ ...state, id: room.id, myCards: [], myEnvido: null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;

    state.players = state.players.filter(p => p.userId !== userId);
    state.teams   = state.teams.map(t => t.filter(id => id !== userId));

    if (state.players.length === 0) {
      await supabase.from('truco_rooms').delete().eq('id', room.id);
      return res.json({ deleted: true });
    }

    await saveRoom(room.id, state, fullState);
    res.json({ ...state, id: room.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/start', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state || { mazo: [], hands: {} };

    if (state.players.length < 2)
      return res.status(400).json({ error: 'Se necesitan al menos 2 jugadores' });

    startHand(state, fullState);
    await saveRoom(room.id, state, fullState);

    const myCards = fullState.hands[req.user.id] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/play-card', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;
    const { cardId } = req.body;

    if (state.phase !== 'playing') return res.status(400).json({ error: 'No es momento de jugar' });
    if (state.currentUserId !== userId) return res.status(400).json({ error: 'No es tu turno' });
    if (state.trucoOffer)  return res.status(400).json({ error: 'Respondé el envite de truco primero' });
    if (state.envidoOffer) return res.status(400).json({ error: 'Respondé el envite de envido primero' });

    const hand = fullState.hands?.[userId];
    if (!hand) return res.status(400).json({ error: 'No tenés cartas' });

    const cardIdx = hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return res.status(400).json({ error: 'Carta inválida' });

    const [card] = hand.splice(cardIdx, 1);
    const player = state.players.find(p => p.userId === userId);
    if (player) { player.playedCards.push(card); player.remainingCards = hand.length; }

    state.trick.push({ userId, username: player?.username || '', card });

    if (state.trick.length >= state.players.length) {
      resolveTrick(state);
    } else {
      const idx     = state.players.findIndex(p => p.userId === userId);
      const nextIdx = (idx + 1) % state.players.length;
      state.currentUserId = state.players[nextIdx].userId;
    }

    await saveRoom(room.id, state, fullState);
    const myCards = fullState.hands[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/call-truco', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;

    if (state.phase !== 'playing') return res.status(400).json({ error: 'No es momento' });
    if (state.trucoOffer)          return res.status(400).json({ error: 'Ya hay un envite pendiente' });

    const offeredPts = Number(req.body.offeredPts);
    if (!offeredPts || offeredPts <= state.trucoPts || offeredPts > 4)
      return res.status(400).json({ error: 'Nivel de truco inválido' });

    const username = state.players.find(p => p.userId === userId)?.username || '';
    state.trucoOffer = { byUserId: userId, byUsername: username, offeredPts };

    await saveRoom(room.id, state, fullState);
    const myCards = fullState?.hands?.[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/respond-truco', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;
    const { accept } = req.body;

    if (!state.trucoOffer) return res.status(400).json({ error: 'No hay envite pendiente' });
    if (state.trucoOffer.byUserId === userId)
      return res.status(400).json({ error: 'No podés responder tu propio envite' });

    if (accept) {
      state.trucoPts      = state.trucoOffer.offeredPts;
      state.trucoAccepted = true;
      state.trucoOffer    = null;
    } else {
      const callerTeam = teamOf(state, state.trucoOffer.byUserId);
      state.trucoOffer = null;
      // Caller gets current trucoPts (what was accepted before the new offer)
      endHand(state, callerTeam);
    }

    await saveRoom(room.id, state, fullState);
    const myCards = fullState?.hands?.[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/call-envido', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;

    if (state.phase !== 'playing')   return res.status(400).json({ error: 'No es momento' });
    if (state.envidoSettled)          return res.status(400).json({ error: 'Envido ya resuelto' });
    if (state.envidoOffer)            return res.status(400).json({ error: 'Ya hay un envite de envido' });
    if ((state.tricksCompleted || 0) > 0)
      return res.status(400).json({ error: 'El envido solo se puede cantar en la primera baza' });

    const type     = req.body.type || 'envido';
    const username = state.players.find(p => p.userId === userId)?.username || '';
    state.envidoOffer = { byUserId: userId, byUsername: username, type };

    await saveRoom(room.id, state, fullState);
    const myCards = fullState?.hands?.[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/respond-envido', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;
    const { accept } = req.body;

    if (!state.envidoOffer) return res.status(400).json({ error: 'No hay envite de envido' });
    if (state.envidoOffer.byUserId === userId)
      return res.status(400).json({ error: 'No podés responder tu propio envite' });

    // Capture offer data before clearing
    const offerType      = state.envidoOffer.type;
    const offererUserId  = state.envidoOffer.byUserId;

    state.envidoSettled = true;
    state.envidoOffer   = null;

    if (accept) {
      const scores = {};
      for (const p of state.players) {
        const hand = fullState?.hands?.[p.userId] || [];
        scores[p.userId] = { username: p.username, pts: calcEnvido(hand), team: teamOf(state, p.userId) };
      }

      let bestPts = -1, winTeam = -1;
      for (const s of Object.values(scores)) {
        if (s.pts > bestPts) { bestPts = s.pts; winTeam = s.team; }
      }

      let envidoPts;
      if (offerType === 'falta_envido') {
        envidoPts = Math.max(1, 15 - state.scores[winTeam === 0 ? 1 : 0]);
      } else if (offerType === 'real_envido') {
        envidoPts = 3;
      } else {
        envidoPts = 2;
      }

      state.scores[winTeam] += envidoPts;
      state.envidoResult = { winnerTeam: winTeam, pts: envidoPts, scores };
    } else {
      const callerTeam = teamOf(state, offererUserId);
      state.scores[callerTeam] += 1;
      state.envidoResult = { winnerTeam: callerTeam, pts: 1, rejected: true };
    }

    if (state.scores[0] >= 15 || state.scores[1] >= 15) {
      const champ = state.scores[0] >= 15 ? 0 : 1;
      state.gameOver = { winnerTeam: champ, scores: [...state.scores] };
      state.status = 'finished';
      state.phase  = 'hand_end';
      state.currentUserId = null;
    }

    await saveRoom(room.id, state, fullState);
    const myCards = fullState?.hands?.[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/mazo', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state;
    const userId    = req.user.id;

    if (state.phase !== 'playing') return res.status(400).json({ error: 'No es momento' });

    const myTeam  = teamOf(state, userId);
    const other   = myTeam === 0 ? 1 : 0;
    const username = state.players.find(p => p.userId === userId)?.username || '';

    state.handEndResult = { mazo: true, byUsername: username };
    endHand(state, other);

    await saveRoom(room.id, state, fullState);
    const myCards = fullState?.hands?.[userId] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/next-hand', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state || { mazo: [], hands: {} };

    if (state.phase === 'playing') {
      // Already started by the other client — just return current state
      const myCards = fullState?.hands?.[req.user.id] || [];
      return res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
    }

    if (state.phase !== 'hand_end') return res.status(400).json({ error: 'La mano no terminó' });
    if (state.gameOver)             return res.status(400).json({ error: 'El juego terminó' });

    startHand(state, fullState);
    await saveRoom(room.id, state, fullState);

    const myCards = fullState.hands[req.user.id] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/rematch', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    const state     = room.state;
    const fullState = room.full_state || { mazo: [], hands: {} };

    if (state.status !== 'finished') return res.status(400).json({ error: 'El juego no terminó' });

    // Reset scores for new game
    state.scores = [0, 0];
    state.gameOver = null;
    startHand(state, fullState);

    await saveRoom(room.id, state, fullState);
    const myCards = fullState.hands[req.user.id] || [];
    res.json({ ...state, id: room.id, myCards, myEnvido: calcEnvido(myCards) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
