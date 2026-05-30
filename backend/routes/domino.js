const express = require('express');
const router  = express.Router();
const { supabase }    = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// ── Tile helpers ──────────────────────────────────────────────────────────────
function allTiles() {
  const t = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) t.push([a, b]);
  return t; // 28 tiles
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hasTile(tiles, t) {
  return tiles.some(x => (x[0]===t[0]&&x[1]===t[1])||(x[0]===t[1]&&x[1]===t[0]));
}
function removeTile(tiles, t) {
  const i = tiles.findIndex(x => (x[0]===t[0]&&x[1]===t[1])||(x[0]===t[1]&&x[1]===t[0]));
  if (i >= 0) tiles.splice(i, 1);
}
function canPlay(tile, L, R, empty) {
  if (empty) return true;
  return tile[0]===L||tile[1]===L||tile[0]===R||tile[1]===R;
}
function pipSum(tiles) { return tiles.reduce((s,[a,b])=>s+a+b,0); }

// ── Game state ────────────────────────────────────────────────────────────────
function publicState(state) {
  return {
    ...state,
    players: state.players.map(p => ({ ...p, tiles: undefined })),
  };
}

function startRound(state) {
  const deck = shuffle(allTiles());
  const n = state.players.length; // 2–4
  const perPlayer = n === 4 ? 7 : n === 3 ? 9 : 14;
  state.players.forEach((p, i) => {
    p.tiles    = deck.slice(i * perPlayer, (i + 1) * perPlayer);
    p.tileCount = p.tiles.length;
  });
  state.boardPieces = [];
  state.boardLeft   = null;
  state.boardRight  = null;
  state.passCount   = 0;
  state.roundWinner = null;
  state.phase       = 'playing';
  state.status      = 'playing';

  // Highest double goes first; if none, player 0
  let firstIdx = 0, highDouble = -1;
  for (let i = 0; i < n; i++) {
    for (const [a, b] of state.players[i].tiles) {
      if (a === b && a > highDouble) { highDouble = a; firstIdx = i; }
    }
  }
  state.currentIdx = firstIdx;
}

function checkRoundEnd(state) {
  const cur = state.players[state.currentIdx];

  if (cur.tileCount === 0) {
    // Dominó — winning team scores all remaining pips
    const points = state.players.reduce((s,p)=>s+pipSum(p.tiles),0);
    state.scores[cur.team] += points;
    state.roundWinner = { team: cur.team, reason: 'domino', points, winner: cur.username };
    state.phase  = 'round_end';
    state.status = 'round_end';
    return;
  }

  // All 4 consecutive passes → blocked
  if (state.passCount >= state.players.length) {
    const teamPips = [0, 1].map(t =>
      state.players.filter(p=>p.team===t).reduce((s,p)=>s+pipSum(p.tiles),0)
    );
    const winTeam = teamPips[0] <= teamPips[1] ? 0 : 1;
    const pts = Math.abs(teamPips[0] - teamPips[1]);
    state.scores[winTeam] += pts;
    state.roundWinner = { team: winTeam, reason: 'blocked', points: pts, teamPips };
    state.phase  = 'round_end';
    state.status = 'round_end';
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function getRoom(id) {
  const { data, error } = await supabase.from('domino_rooms').select('*').eq('id',id).single();
  if (error || !data) throw new Error('Sala no encontrada');
  return data;
}
async function saveRoom(id, state) {
  const { error } = await supabase.from('domino_rooms')
    .update({ state: publicState(state), full_state: state, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/rooms', async (req, res) => {
  try {
    await supabase.from('domino_rooms').delete()
      .lt('updated_at', new Date(Date.now() - 7_200_000).toISOString());
    const { data, error } = await supabase.from('domino_rooms')
      .select('id,name,state,updated_at').order('updated_at',{ascending:false}).limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { name = 'Mesa Dominó', maxPoints = 100 } = req.body;
    const init = {
      status:'waiting', phase:'waiting',
      players:[{ userId:req.user.id, username:req.user.username, team:0, tiles:[], tileCount:0 }],
      boardPieces:[], boardLeft:null, boardRight:null,
      currentIdx:0, passCount:0, scores:[0,0], maxPoints, maxPlayers:4, roundWinner:null, name,
    };
    const { data, error } = await supabase.from('domino_rooms')
      .insert({ name, state:init, full_state:init }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    const me    = state.players.find(p => p.userId === req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles || [] });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    if (state.players.length >= 4)         return res.status(400).json({ error:'Sala llena (máx. 4)' });
    if (state.phase !== 'waiting')          return res.status(400).json({ error:'Partida en curso' });
    if (!state.players.find(p=>p.userId===req.user.id)) {
      // Teams: seats 0,2 → team 0; seats 1,3 → team 1
      const team = [0,1,0,1][state.players.length] ?? 0;
      state.players.push({ userId:req.user.id, username:req.user.username, team, tiles:[], tileCount:0 });
    }
    await saveRoom(req.params.id, state);
    const me = state.players.find(p=>p.userId===req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    state.players = state.players.filter(p=>p.userId!==req.user.id);
    if (state.players.length === 0) {
      await supabase.from('domino_rooms').delete().eq('id', req.params.id);
    } else {
      state.players.forEach((p,i) => { p.team = [0,1,0,1][i]??0; });
      await saveRoom(req.params.id, state);
    }
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/start', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    if (state.players.length < 2) return res.status(400).json({ error:'Mínimo 2 jugadores' });
    startRound(state);
    await saveRoom(req.params.id, state);
    const me = state.players.find(p=>p.userId===req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/play', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    const { tile, side } = req.body; // tile:[a,b], side:'left'|'right'
    if (state.phase !== 'playing') return res.status(400).json({ error:'No es momento de jugar' });
    const player = state.players[state.currentIdx];
    if (!player||player.userId!==req.user.id) return res.status(400).json({ error:'No es tu turno' });
    if (!hasTile(player.tiles, tile)) return res.status(400).json({ error:'No tenés esa ficha' });

    const [t0,t1] = tile;
    const empty   = state.boardPieces.length === 0;
    let placed    = false;

    if (empty) {
      state.boardPieces.push({ a:t0, b:t1 });
      state.boardLeft  = t0;
      state.boardRight = t1;
      placed = true;
    } else if (side === 'left') {
      if      (t1 === state.boardLeft) { state.boardPieces.unshift({a:t0,b:t1}); state.boardLeft=t0; placed=true; }
      else if (t0 === state.boardLeft) { state.boardPieces.unshift({a:t1,b:t0}); state.boardLeft=t1; placed=true; }
    } else {
      if      (t0 === state.boardRight) { state.boardPieces.push({a:t0,b:t1}); state.boardRight=t1; placed=true; }
      else if (t1 === state.boardRight) { state.boardPieces.push({a:t1,b:t0}); state.boardRight=t0; placed=true; }
    }

    if (!placed) return res.status(400).json({ error:'Jugada inválida para ese extremo' });

    removeTile(player.tiles, tile);
    player.tileCount = player.tiles.length;
    state.passCount  = 0;
    checkRoundEnd(state);
    if (state.phase === 'playing') state.currentIdx = (state.currentIdx+1) % state.players.length;

    await saveRoom(req.params.id, state);
    const me = state.players.find(p=>p.userId===req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/pass', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    if (state.phase !== 'playing') return res.status(400).json({ error:'No es momento de jugar' });
    const player = state.players[state.currentIdx];
    if (!player||player.userId!==req.user.id) return res.status(400).json({ error:'No es tu turno' });

    // Only allow pass if truly no playable tile
    const empty = state.boardPieces.length === 0;
    if (!empty && player.tiles.some(t=>canPlay(t,state.boardLeft,state.boardRight,false)))
      return res.status(400).json({ error:'Tenés fichas jugables, no podés pasar' });

    state.passCount = (state.passCount||0) + 1;
    state.currentIdx = (state.currentIdx+1) % state.players.length;
    checkRoundEnd(state);

    await saveRoom(req.params.id, state);
    const me = state.players.find(p=>p.userId===req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/next-round', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.full_state;
    if (state.phase !== 'round_end') return res.status(400).json({ error:'La ronda no terminó' });
    if (state.scores[0]>=state.maxPoints||state.scores[1]>=state.maxPoints) {
      state.phase='game_end'; state.status='game_end';
    } else {
      startRound(state);
    }
    await saveRoom(req.params.id, state);
    const me = state.players.find(p=>p.userId===req.user.id);
    res.json({ state: publicState(state), myTiles: me?.tiles||[] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
