// Truco Argentino — Socket.io handler (2 o 4 jugadores, mazo español)
// Modalidad: 1v1 o 2v2

// Mazo español (40 cartas, sin 8, 9 ni Joker)
const PALOS = ['Espadas','Bastos','Copas','Oros'];
const NUMS  = [1,2,3,4,5,6,7,10,11,12];

// Jerarquía truco (de mayor a menor)
// ancho espadas=0, ancho bastos=1, 7 espadas=2, 7 oros=3,
// luego: 3,2,1(no-ancho),12,11,10,7(no-especial),6,5,4
function trucoRank(num, palo) {
  if (num === 1 && palo === 'Espadas') return 14;
  if (num === 1 && palo === 'Bastos')  return 13;
  if (num === 7 && palo === 'Espadas') return 12;
  if (num === 7 && palo === 'Oros')    return 11;
  if (num === 3)  return 10;
  if (num === 2)  return 9;
  if (num === 1)  return 8; // copas/oros
  if (num === 12) return 7;
  if (num === 11) return 6;
  if (num === 10) return 5;
  if (num === 7)  return 4; // bastos/copas
  if (num === 6)  return 3;
  if (num === 5)  return 2;
  if (num === 4)  return 1;
  return 0;
}

// Puntos envido: figuras (10,11,12) valen 0; resto su número
function envidoVal(num) { return num >= 10 ? 0 : num; }

function calcEnvido(cards) {
  // Mejor combinación: 2 del mismo palo → 20 + suma, o mejor carta suelta
  let best = 0;
  for (const p of PALOS) {
    const same = cards.filter(c => c.palo === p);
    if (same.length >= 2) {
      same.sort((a,b) => envidoVal(b.num) - envidoVal(a.num));
      const pts = 20 + envidoVal(same[0].num) + envidoVal(same[1].num);
      if (pts > best) best = pts;
    }
    if (same.length === 1) {
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

// ── Room store ────────────────────────────────────────────────────────────────
const rooms = new Map();

function createRoom(name, mode) { // mode: '1v1' | '2v2'
  const id = Math.random().toString(36).slice(2, 7).toUpperCase();
  const maxP = mode === '2v2' ? 4 : 2;
  const room = {
    id, name, mode, maxPlayers: maxP,
    players: [], teams: [[], []], // team[0] = seats 0,2; team[1] = seats 1,3
    status: 'waiting',
    // hand state
    mazo: [], hands: {}, playedCards: {},
    trick: [], trickWins: [0, 0], // per team
    roundPts: [0, 0], // points this hand
    scores: [0, 0],   // total game score (first to 15)
    currentIdx: 0,
    // calls
    trucoOffer: null,   // { by, value } where value: 1=truco, 2=retruco, 3=vale4
    trucoValue: 1,      // current accepted truco value
    trucoAccepted: false,
    envidoOffer: null,  // { by, value } where value: 2=envido, 5=realEnvido, 'falta'=remaining
    envidoSettled: false,
    envidoPoints: 0,    // pot for envido
    phase: 'waiting',   // waiting, envido, truco, tricks, hand_end
  };
  rooms.set(id, room);
  return room;
}

function teamOf(room, userId) {
  return room.teams[0].includes(userId) ? 0 : room.teams[1].includes(userId) ? 1 : -1;
}

function startHand(room, io, ns) {
  room.mazo = newMazo();
  room.trick = [];
  room.trickWins = [0, 0];
  room.roundPts  = [1, 1]; // 1 pt base for truco (antes de cantar)
  room.playedCards = {};
  room.hands = {};
  room.trucoOffer   = null;
  room.trucoValue   = 1;
  room.trucoAccepted = false;
  room.envidoOffer  = null;
  room.envidoSettled = false;
  room.envidoPoints  = 2;
  room.phase = 'playing';
  room.status = 'playing';

  for (const p of room.players) {
    room.hands[p.userId] = [room.mazo.pop(), room.mazo.pop(), room.mazo.pop()];
    room.playedCards[p.userId] = [];
  }

  room.currentIdx = 0; // first player goes first

  broadcast(room, ns, 'game:state', publicState(room));
  for (const p of room.players) {
    const sock = ns.sockets.get(p.socketId);
    if (sock) sock.emit('game:hand', { cards: room.hands[p.userId], envido: calcEnvido(room.hands[p.userId]) });
  }
}

function publicState(room) {
  return {
    id: room.id, name: room.name, mode: room.mode,
    players: room.players.map(p => ({
      userId: p.userId, username: p.username, team: teamOf(room, p.userId),
      playedCards: room.playedCards[p.userId] || [], remainingCards: (room.hands[p.userId] || []).length,
    })),
    scores: room.scores, trickWins: room.trickWins,
    currentUserId: room.players[room.currentIdx]?.userId,
    trucoOffer: room.trucoOffer, trucoValue: room.trucoValue, trucoAccepted: room.trucoAccepted,
    envidoOffer: room.envidoOffer, envidoSettled: room.envidoSettled,
    phase: room.phase, status: room.status, trick: room.trick,
  };
}

function broadcast(room, ns, event, data) {
  ns.to(room.id).emit(event, data);
}

function nextIdx(room) {
  return (room.currentIdx + 1) % room.players.length;
}

function checkTrick(room, ns) {
  if (room.trick.length < room.players.length) return; // not all played

  // Find winner of trick
  let bestRank = -1, bestTeam = -1;
  let tie = true;
  const firstRank = trucoRank(room.trick[0].card.num, room.trick[0].card.palo);
  for (const t of room.trick) {
    const r = trucoRank(t.card.num, t.card.palo);
    if (r !== firstRank) tie = false;
    if (r > bestRank) { bestRank = r; bestTeam = teamOf(room, t.userId); }
  }

  if (tie) {
    // Draw → first player's team wins (parda, primera gana en truco)
    bestTeam = teamOf(room, room.trick[0].userId);
    broadcast(room, ns, 'game:trick_result', { winner: null, draw: true, trickWins: room.trickWins });
  } else {
    room.trickWins[bestTeam]++;
    broadcast(room, ns, 'game:trick_result', { winnerTeam: bestTeam, draw: false, trick: room.trick, trickWins: room.trickWins });
  }

  room.trick = [];

  // Check if hand is over (team wins 2 tricks or all 3 played)
  const totalTricks = room.trickWins[0] + room.trickWins[1];
  const winner = room.trickWins.findIndex(w => w >= 2);

  if (winner !== -1 || totalTricks >= 3) {
    const w = winner !== -1 ? winner : room.trickWins[0] >= room.trickWins[1] ? 0 : 1;
    endHand(room, ns, w);
  } else {
    // Next player: winner of last trick goes first
    const lastWinner = room.trick.length === 0 ? null : room.trick[room.trick.length - 1];
    if (bestTeam !== -1) {
      const next = room.players.findIndex(p => teamOf(room, p.userId) === bestTeam);
      if (next !== -1) room.currentIdx = next;
    }
    broadcast(room, ns, 'game:state', publicState(room));
  }
}

function endHand(room, ns, winnerTeam) {
  const trucoPoints = room.trucoAccepted ? room.trucoValue * (room.trucoValue === 3 ? 4 : room.trucoValue === 2 ? 3 : 2) : 1;
  room.scores[winnerTeam] += trucoPoints;

  if (!room.envidoSettled) {
    // Envido no fue cantado: nobody gets points
  }

  broadcast(room, ns, 'game:hand_end', {
    winnerTeam, trucoPoints, scores: room.scores,
    envidoSettled: room.envidoSettled,
  });

  if (room.scores[0] >= 15 || room.scores[1] >= 15) {
    const champ = room.scores[0] >= 15 ? 0 : 1;
    broadcast(room, ns, 'game:over', { winnerTeam: champ, scores: room.scores });
    room.status = 'finished';
    room.phase  = 'waiting';
    return;
  }

  setTimeout(() => { if (rooms.has(room.id)) startHand(room, ns, ns); }, 4000);
}

// ── Socket handler ────────────────────────────────────────────────────────────
module.exports = function registerTruco(io) {
  const ns = io.of('/truco');

  ns.on('connection', socket => {
    let currentRoom = null;
    let currentUser = null;

    socket.on('rooms:list', () => {
      socket.emit('rooms:list', [...rooms.values()].map(r => ({
        id: r.id, name: r.name, mode: r.mode, maxPlayers: r.maxPlayers,
        players: r.players.length, status: r.status,
      })));
    });

    socket.on('room:create', ({ name, mode, user }) => {
      const room = createRoom(name || `Sala de ${user.username}`, mode || '1v1');
      socket.emit('room:created', { id: room.id });
    });

    socket.on('room:join', ({ roomId, user }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit('error', 'Sala no encontrada');
      if (room.players.length >= room.maxPlayers) return socket.emit('error', 'Sala llena');

      currentRoom = room;
      currentUser = user;
      socket.join(roomId);

      if (!room.players.find(p => p.userId === user.id)) {
        room.players.push({ userId: user.id, username: user.username, socketId: socket.id });
        // Assign teams: 0,2 → team 0 ; 1,3 → team 1
        const seat = room.players.length - 1;
        room.teams[seat % 2].push(user.id);
      } else {
        room.players.find(p => p.userId === user.id).socketId = socket.id;
      }

      broadcast(room, ns, 'game:state', publicState(room));
    });

    socket.on('game:start', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.players.length < 2) return socket.emit('error', 'Se necesitan al menos 2 jugadores');
      startHand(room, ns, ns);
    });

    // Play a card
    socket.on('game:play_card', ({ roomId, cardId }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'playing') return;
      if (room.players[room.currentIdx]?.userId !== currentUser?.id) return socket.emit('error', 'No es tu turno');

      const hand = room.hands[currentUser.id];
      const idx  = hand.findIndex(c => c.id === cardId);
      if (idx === -1) return socket.emit('error', 'Carta inválida');

      const [card] = hand.splice(idx, 1);
      room.playedCards[currentUser.id].push(card);
      room.trick.push({ userId: currentUser.id, username: currentUser.username, card });
      room.currentIdx = nextIdx(room);

      broadcast(room, ns, 'game:card_played', { userId: currentUser.id, card, trick: room.trick });
      checkTrick(room, ns);
    });

    // Truco call
    socket.on('game:truco', ({ roomId, level }) => {
      const room = rooms.get(roomId);
      if (!room || room.trucoOffer) return;
      room.trucoOffer = { by: currentUser.id, level: level || 1 }; // 1=truco, 2=retruco, 3=vale4
      broadcast(room, ns, 'game:truco_offer', { by: currentUser.username, level });
    });

    socket.on('game:truco_response', ({ roomId, accept }) => {
      const room = rooms.get(roomId);
      if (!room || !room.trucoOffer || room.trucoOffer.by === currentUser.id) return;
      if (accept) {
        room.trucoAccepted = true;
        room.trucoValue    = room.trucoOffer.level;
        broadcast(room, ns, 'game:truco_accepted', { by: currentUser.username, value: room.trucoValue });
      } else {
        // Rejected: offerer's team wins current truco value
        const offererTeam = teamOf(room, room.trucoOffer.by);
        room.scores[offererTeam] += room.trucoValue;
        broadcast(room, ns, 'game:truco_rejected', { by: currentUser.username });
        endHand(room, ns, offererTeam);
      }
      room.trucoOffer = null;
    });

    // Envido call
    socket.on('game:envido', ({ roomId, type }) => {
      const room = rooms.get(roomId);
      if (!room || room.envidoSettled) return;
      room.envidoOffer = { by: currentUser.id, type: type || 'envido' };
      broadcast(room, ns, 'game:envido_offer', { by: currentUser.username, type });
    });

    socket.on('game:envido_response', ({ roomId, accept }) => {
      const room = rooms.get(roomId);
      if (!room || !room.envidoOffer || room.envidoOffer.by === currentUser.id) return;

      if (accept) {
        // Showdown: reveal envido points
        const scores = {};
        for (const p of room.players) {
          scores[p.userId] = { username: p.username, pts: calcEnvido(room.hands[p.userId] || []), team: teamOf(room, p.userId) };
        }
        let best = -1, winTeam = -1;
        for (const [uid, s] of Object.entries(scores)) {
          if (s.pts > best) { best = s.pts; winTeam = s.team; }
        }
        const pts = room.envidoOffer.type === 'falta' ? (15 - room.scores[winTeam === 0 ? 1 : 0]) : room.envidoOffer.type === 'realenvido' ? 5 : room.envidoOffer.type === 'envido+envido' ? 4 : 2;
        room.scores[winTeam] += pts;
        room.envidoSettled = true;
        broadcast(room, ns, 'game:envido_result', { winnerTeam: winTeam, pts, scores, scores_total: room.scores });
      } else {
        const offererTeam = teamOf(room, room.envidoOffer.by);
        room.scores[offererTeam] += 1;
        room.envidoSettled = true;
        broadcast(room, ns, 'game:envido_result', { winnerTeam: offererTeam, pts: 1, rejected: true, scores_total: room.scores });
      }
      room.envidoOffer = null;
    });

    // Mazo (rendirse / irse al mazo)
    socket.on('game:mazo', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const myTeam = teamOf(room, currentUser.id);
      const other  = myTeam === 0 ? 1 : 0;
      broadcast(room, ns, 'game:mazo', { by: currentUser.username });
      endHand(room, ns, other);
    });

    socket.on('room:leave', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.players = room.players.filter(p => p.userId !== currentUser?.id);
      for (const t of room.teams) {
        const i = t.indexOf(currentUser?.id);
        if (i !== -1) t.splice(i, 1);
      }
      socket.leave(roomId);
      if (room.players.length === 0) rooms.delete(roomId);
      else broadcast(room, ns, 'game:state', publicState(room));
    });

    socket.on('disconnect', () => {
      if (currentRoom && currentUser) {
        currentRoom.players = currentRoom.players.filter(p => p.userId !== currentUser.id);
        if (currentRoom.players.length === 0) rooms.delete(currentRoom.id);
        else broadcast(currentRoom, ns, 'game:state', publicState(currentRoom));
      }
    });
  });
};
