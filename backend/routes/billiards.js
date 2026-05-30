const express = require('express');
const router  = express.Router();
const { supabase }    = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// ── Helpers ───────────────────────────────────────────────────────────────────
function initialBalls() {
  const BALL_R = 11;
  const FW = 784, FH = 374;
  const rx = FW * 0.72, ry = FH / 2;
  const rowDx = BALL_R * 2 * Math.cos(Math.PI / 6);
  const rowDy = BALL_R * 2;

  const balls = [{ id: 0, x: FW * 0.25, y: ry, pocketed: false }]; // cue ball

  const rack = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col <= row; col++)
      rack.push({ bx: rx + row * rowDx, by: ry - row * BALL_R + col * rowDy });

  // Shuffle non-8 balls, keep 8-ball in center (position 4 of the 15)
  const others = [1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const rackIds = [...others.slice(0,4), 8, ...others.slice(4)];

  rack.forEach((pos, i) => {
    balls.push({ id: rackIds[i], x: pos.bx, y: pos.by, pocketed: false });
  });
  return balls;
}

function publicState(state) {
  return { ...state };
}

async function getRoom(id) {
  const { data, error } = await supabase.from('billiards_rooms').select('*').eq('id', id).single();
  if (error || !data) throw new Error('Sala no encontrada');
  return data;
}

async function saveRoom(id, state) {
  const { error } = await supabase.from('billiards_rooms')
    .update({ state: publicState(state), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/rooms', async (req, res) => {
  try {
    await supabase.from('billiards_rooms').delete()
      .lt('updated_at', new Date(Date.now() - 7_200_000).toISOString());
    const { data, error } = await supabase.from('billiards_rooms')
      .select('id,name,state,updated_at').order('updated_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { name = 'Mesa Billar', mode = '1v1' } = req.body;
    const maxPlayers = mode === '2v2' ? 4 : 2;
    const init = {
      phase: 'waiting', mode, maxPlayers,
      players: [{ userId: req.user.id, username: req.user.username, team: 0 }],
      teams: [
        { playerIds: [req.user.id], group: null, pocketed: [] },
        { playerIds: [],            group: null, pocketed: [] },
      ],
      currentTeam: 0, currentPlayerInTeam: 0,
      balls: initialBalls(),
      groupAssigned: false,
      cueBallInHand: false,
      winner: null, name,
    };
    const { data, error } = await supabase.from('billiards_rooms')
      .insert({ name, state: init }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    res.json({ state: room.state });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    if (state.players.find(p => p.userId === req.user.id))
      return res.json({ state });
    if (state.players.length >= state.maxPlayers)
      return res.status(400).json({ error: 'Sala llena' });
    if (state.phase !== 'waiting')
      return res.status(400).json({ error: 'Partida en curso' });

    // Assign to team 1
    state.players.push({ userId: req.user.id, username: req.user.username, team: 1 });
    state.teams[1].playerIds.push(req.user.id);
    await saveRoom(req.params.id, state);
    res.json({ state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    state.players = state.players.filter(p => p.userId !== req.user.id);
    state.teams.forEach(t => { t.playerIds = t.playerIds.filter(id => id !== req.user.id); });
    if (state.players.length === 0) {
      await supabase.from('billiards_rooms').delete().eq('id', req.params.id);
    } else {
      await saveRoom(req.params.id, state);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/start', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    if (state.players.length < 2) return res.status(400).json({ error: 'Mínimo 2 jugadores' });
    state.phase         = 'playing';
    state.balls         = initialBalls();
    state.groupAssigned = false;
    state.currentTeam   = 0;
    state.currentPlayerInTeam = 0;
    state.winner        = null;
    state.cueBallInHand = false;
    state.teams.forEach(t => { t.group = null; t.pocketed = []; });
    await saveRoom(req.params.id, state);
    res.json({ state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/shot', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    if (state.phase !== 'playing') return res.status(400).json({ error: 'No se puede disparar ahora' });

    const myId  = req.user.id;
    const team  = state.teams[state.currentTeam];
    const curPlayerId = team.playerIds[state.currentPlayerInTeam % team.playerIds.length];
    if (curPlayerId !== myId) return res.status(400).json({ error: 'No es tu turno' });

    const { balls, pocketedThisShot = [], foulCueBall = false } = req.body;

    // Update ball positions from client physics
    if (Array.isArray(balls)) {
      state.balls = balls.map(b => ({ ...b }));
    }

    const cueBallBack = foulCueBall;
    state.cueBallInHand = cueBallBack;

    // Group assignment: first shot that pockets a ball assigns groups
    if (!state.groupAssigned && pocketedThisShot.length > 0) {
      const firstPocketed = pocketedThisShot[0];
      if (firstPocketed !== 0 && firstPocketed !== 8) {
        state.groupAssigned = true;
        const isSolid = firstPocketed <= 7;
        state.teams[state.currentTeam].group    = isSolid ? 'solids'  : 'stripes';
        state.teams[1 - state.currentTeam].group = isSolid ? 'stripes' : 'solids';
      }
    }

    // Pocket the balls into team records
    const myGroup = team.group;
    const oppTeam = state.teams[1 - state.currentTeam];
    let validPocketed = 0, sunkEight = false, foulEight = false;

    for (const id of pocketedThisShot) {
      if (id === 0) continue; // cue ball handled by foulCueBall
      if (id === 8) {
        // 8-ball pocketed
        const allMyGroupDone = myGroup
          ? state.balls.filter(b => !b.pocketed && (myGroup === 'solids' ? b.id >= 1 && b.id <= 7 : b.id >= 9 && b.id <= 15)).length === 0
          : false;
        if (allMyGroupDone && !foulCueBall) {
          sunkEight = true;
          state.winner = state.currentTeam;
        } else {
          foulEight = true;
          state.winner = 1 - state.currentTeam; // lose by sinking 8 early
        }
      } else {
        // Regular ball
        const isMyBall = myGroup === 'solids' ? id <= 7 : id >= 9;
        if (isMyBall || !myGroup) {
          team.pocketed.push(id);
          validPocketed++;
        } else {
          oppTeam.pocketed.push(id);
        }
      }
    }

    if (state.winner !== null) {
      state.phase = 'game_end';
    } else {
      // Turn logic: keep turn if pocketed your ball and no foul
      const keepTurn = validPocketed > 0 && !foulCueBall && !foulEight;
      if (!keepTurn) {
        // Switch team
        state.currentTeam = 1 - state.currentTeam;
        const nextTeam = state.teams[state.currentTeam];
        state.currentPlayerInTeam = (state.currentPlayerInTeam + 1) % Math.max(1, nextTeam.playerIds.length);
      }
    }

    await saveRoom(req.params.id, state);
    res.json({ state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/place-cue', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    const { x, y } = req.body;
    const cb = state.balls.find(b => b.id === 0);
    if (cb) { cb.x = x; cb.y = y; cb.pocketed = false; }
    state.cueBallInHand = false;
    await saveRoom(req.params.id, state);
    res.json({ state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rooms/:id/rematch', requireAuth, async (req, res) => {
  try {
    const room  = await getRoom(req.params.id);
    const state = room.state;
    state.phase         = 'playing';
    state.balls         = initialBalls();
    state.groupAssigned = false;
    state.currentTeam   = typeof state.winner === 'number' ? 1 - state.winner : 0;
    state.currentPlayerInTeam = 0;
    state.winner        = null;
    state.cueBallInHand = false;
    state.teams.forEach(t => { t.group = null; t.pocketed = []; });
    await saveRoom(req.params.id, state);
    res.json({ state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
