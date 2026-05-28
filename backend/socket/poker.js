// Texas Hold'em Poker — Socket.io handler
const { supabase } = require('../supabase');

const SUITS  = ['♠','♥','♦','♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function newDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push({ suit: s, value: v });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const VAL_RANK = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function cardRank(v) { return VAL_RANK[v] || 0; }

function evaluateHand(cards) {
  // Returns { rank: 0-8, name, tiebreakers }
  const ranks = cards.map(c => cardRank(c.value)).sort((a,b) => b-a);
  const suits  = cards.map(c => c.suit);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const freq = Object.entries(counts).sort((a,b) => b[1]-a[1] || b[0]-a[0]);
  const isFlush    = suits.every(s => s === suits[0]);
  const isStraight = ranks.length === 5 && ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5;
  const isLowAce   = JSON.stringify(ranks) === JSON.stringify([14,5,4,3,2]);

  if (isFlush && (isStraight || isLowAce)) {
    const high = isLowAce ? 5 : ranks[0];
    return { rank: high === 14 ? 9 : 8, name: high === 14 ? 'Royal Flush' : 'Straight Flush', tiebreakers: [high] };
  }
  if (freq[0][1] === 4) return { rank: 7, name: 'Póker', tiebreakers: freq.map(([r]) => +r) };
  if (freq[0][1] === 3 && freq[1][1] === 2) return { rank: 6, name: 'Full House', tiebreakers: freq.map(([r]) => +r) };
  if (isFlush)    return { rank: 5, name: 'Color', tiebreakers: ranks };
  if (isStraight || isLowAce) return { rank: 4, name: 'Escalera', tiebreakers: [isLowAce ? 5 : ranks[0]] };
  if (freq[0][1] === 3) return { rank: 3, name: 'Trío', tiebreakers: freq.map(([r]) => +r) };
  if (freq[0][1] === 2 && freq[1][1] === 2) return { rank: 2, name: 'Doble Par', tiebreakers: freq.map(([r]) => +r) };
  if (freq[0][1] === 2) return { rank: 1, name: 'Par', tiebreakers: freq.map(([r]) => +r) };
  return { rank: 0, name: 'Carta Alta', tiebreakers: ranks };
}

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [...combinations(rest, k-1).map(c => [first,...c]), ...combinations(rest, k)];
}

function bestHand(holeCards, community) {
  const all = [...holeCards, ...community];
  let best = null;
  for (const combo of combinations(all, 5)) {
    const h = evaluateHand(combo);
    if (!best || h.rank > best.rank || (h.rank === best.rank && compareTiebreakers(h.tiebreakers, best.tiebreakers) > 0)) {
      best = { ...h, cards: combo };
    }
  }
  return best;
}

function compareTiebreakers(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ── Room store ────────────────────────────────────────────────────────────────
const rooms = new Map();

function getRoom(id) { return rooms.get(id); }

function createRoom({ name, buyIn, maxPlayers }) {
  const id = Math.random().toString(36).slice(2, 8).toUpperCase();
  const room = {
    id, name, buyIn: buyIn || 100, maxPlayers: maxPlayers || 6,
    players: [], status: 'waiting',
    deck: [], community: [], pot: 0,
    currentBet: 0, dealerIdx: 0, currentIdx: 0,
    phase: 'waiting', minRaise: buyIn || 100,
  };
  rooms.set(id, room);
  return room;
}

function roomView(room, forUserId) {
  return {
    ...room,
    players: room.players.map(p => ({
      ...p,
      holeCards: p.userId === forUserId ? p.holeCards : (p.holeCards ? p.holeCards.map(() => null) : []),
    })),
  };
}

function nextActive(room, from) {
  let idx = (from + 1) % room.players.length;
  let tries = 0;
  while (room.players[idx]?.status !== 'active' && tries < room.players.length) {
    idx = (idx + 1) % room.players.length;
    tries++;
  }
  return idx;
}

function activePlayers(room) { return room.players.filter(p => p.status === 'active'); }

function advancePhase(room, io) {
  const acts = activePlayers(room);
  if (acts.length <= 1) return endRound(room, io);

  const phases = ['preflop','flop','turn','river'];
  const next = phases[phases.indexOf(room.phase) + 1];
  if (!next) return showdown(room, io);

  room.phase = next;
  room.currentBet = 0;
  for (const p of room.players) { p.roundBet = 0; if (p.status === 'active') p.acted = false; }

  if (next === 'flop')  { room.community.push(room.deck.pop(), room.deck.pop(), room.deck.pop()); }
  if (next === 'turn')  { room.community.push(room.deck.pop()); }
  if (next === 'river') { room.community.push(room.deck.pop()); }

  const sbIdx = (room.dealerIdx + 1) % room.players.length;
  room.currentIdx = nextActive(room, room.dealerIdx);

  io.to(room.id).emit('game:state', sanitizeRoom(room));
}

function showdown(room, io) {
  const acts = activePlayers(room);
  let winner = null;
  let bestResult = null;

  for (const p of acts) {
    const h = bestHand(p.holeCards, room.community);
    p.bestHand = h;
    if (!bestResult || h.rank > bestResult.rank || (h.rank === bestResult.rank && compareTiebreakers(h.tiebreakers, bestResult.tiebreakers) > 0)) {
      bestResult = h;
      winner = p;
    }
  }

  if (winner) winner.chips += room.pot;
  room.status = 'waiting';
  room.phase = 'showdown';

  io.to(room.id).emit('game:showdown', {
    community: room.community,
    players: acts.map(p => ({ userId: p.userId, username: p.username, holeCards: p.holeCards, bestHand: p.bestHand })),
    winner: { userId: winner?.userId, username: winner?.username, handName: bestResult?.name },
    pot: room.pot,
  });

  setTimeout(() => {
    if (rooms.has(room.id)) startNewHand(room, io);
  }, 5000);
}

function endRound(room, io) {
  const last = activePlayers(room)[0];
  if (last) last.chips += room.pot;
  room.status = 'waiting';
  room.phase = 'showdown';
  io.to(room.id).emit('game:showdown', {
    community: room.community,
    players: [],
    winner: { userId: last?.userId, username: last?.username, handName: 'Última en pie' },
    pot: room.pot,
  });
  setTimeout(() => { if (rooms.has(room.id)) startNewHand(room, io); }, 4000);
}

function startNewHand(room, io) {
  // Remove busted players
  room.players = room.players.filter(p => p.chips > 0);
  if (room.players.length < 2) {
    room.status = 'waiting';
    room.phase  = 'waiting';
    io.to(room.id).emit('game:state', sanitizeRoom(room));
    return;
  }

  room.deck      = newDeck();
  room.community = [];
  room.pot       = 0;
  room.currentBet = 0;
  room.phase      = 'preflop';
  room.status     = 'playing';
  room.dealerIdx  = (room.dealerIdx + 1) % room.players.length;

  for (const p of room.players) {
    p.status   = 'active';
    p.roundBet = 0;
    p.acted    = false;
    p.holeCards = [room.deck.pop(), room.deck.pop()];
    p.bestHand  = null;
  }

  // Post blinds
  const sb = (room.dealerIdx + 1) % room.players.length;
  const bb = (room.dealerIdx + 2) % room.players.length;
  const sbAmt = Math.floor(room.buyIn / 2);
  const bbAmt = room.buyIn;

  postBlind(room, sb, sbAmt);
  postBlind(room, bb, bbAmt);
  room.currentBet = bbAmt;
  room.minRaise   = bbAmt;
  room.currentIdx = (bb + 1) % room.players.length;

  io.to(room.id).emit('game:state', sanitizeRoom(room));
  for (const p of room.players) {
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) sock.emit('game:hole_cards', { holeCards: p.holeCards });
  }
}

function postBlind(room, idx, amount) {
  const p = room.players[idx];
  if (!p) return;
  const paid = Math.min(amount, p.chips);
  p.chips   -= paid;
  p.roundBet = paid;
  room.pot  += paid;
  if (p.chips === 0) p.status = 'allIn';
}

function sanitizeRoom(room) {
  return {
    ...room,
    players: room.players.map(p => ({ ...p, holeCards: p.holeCards ? p.holeCards.map(() => null) : [] })),
  };
}

function checkRoundEnd(room, io) {
  const acts = activePlayers(room);
  if (acts.length <= 1) return endRound(room, io);

  const allActed = acts.every(p => p.acted && p.roundBet === room.currentBet || p.status === 'allIn');
  if (allActed) advancePhase(room, io);
  else io.to(room.id).emit('game:state', sanitizeRoom(room));
}

// ── Socket handler ────────────────────────────────────────────────────────────
module.exports = function registerPoker(io) {
  const ns = io.of('/poker');

  ns.on('connection', socket => {
    let currentRoom = null;
    let currentUser = null;

    socket.on('rooms:list', () => {
      socket.emit('rooms:list', [...rooms.values()].map(r => ({
        id: r.id, name: r.name, buyIn: r.buyIn, maxPlayers: r.maxPlayers,
        players: r.players.length, status: r.status,
      })));
    });

    socket.on('room:create', ({ name, buyIn, maxPlayers, user }) => {
      const room = createRoom({ name, buyIn, maxPlayers });
      socket.emit('room:created', { id: room.id });
    });

    socket.on('room:join', ({ roomId, user }) => {
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', 'Sala no encontrada');
      if (room.players.length >= room.maxPlayers) return socket.emit('error', 'Sala llena');
      if (room.status === 'playing') return socket.emit('error', 'Partida en curso');

      currentRoom = room;
      currentUser = user;
      socket.join(roomId);

      const existing = room.players.find(p => p.userId === user.id);
      if (!existing) {
        room.players.push({
          userId: user.id, username: user.username,
          chips: room.buyIn * 10, status: 'waiting',
          holeCards: [], roundBet: 0, acted: false,
          socketId: socket.id,
        });
      } else {
        existing.socketId = socket.id;
      }

      ns.to(roomId).emit('game:state', sanitizeRoom(room));
      socket.emit('room:joined', { room: roomView(room, user.id) });
    });

    socket.on('game:start', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || room.players.length < 2) return socket.emit('error', 'Se necesitan al menos 2 jugadores');
      startNewHand(room, ns);
    });

    socket.on('game:action', ({ roomId, action, amount }) => {
      const room = getRoom(roomId);
      if (!room || room.phase === 'waiting' || room.phase === 'showdown') return;

      const player = room.players[room.currentIdx];
      if (!player || player.userId !== currentUser?.id) return socket.emit('error', 'No es tu turno');

      const callAmount = room.currentBet - player.roundBet;

      if (action === 'fold') {
        player.status = 'folded';
        player.acted  = true;
      } else if (action === 'check') {
        if (callAmount > 0) return socket.emit('error', 'No podés pasar, hay apuesta');
        player.acted = true;
      } else if (action === 'call') {
        const paid = Math.min(callAmount, player.chips);
        player.chips   -= paid;
        player.roundBet += paid;
        room.pot       += paid;
        player.acted    = true;
        if (player.chips === 0) player.status = 'allIn';
      } else if (action === 'raise') {
        const total = parseInt(amount);
        if (total <= room.currentBet) return socket.emit('error', 'Raise debe ser mayor a la apuesta actual');
        const extra = total - player.roundBet;
        if (extra > player.chips) return socket.emit('error', 'Chips insuficientes');
        player.chips   -= extra;
        player.roundBet = total;
        room.pot       += extra;
        room.currentBet = total;
        room.minRaise   = total - (room.currentBet - extra);
        player.acted    = true;
        for (const p of activePlayers(room)) if (p.userId !== player.userId) p.acted = false;
        if (player.chips === 0) player.status = 'allIn';
      } else if (action === 'allin') {
        const extra = player.chips;
        player.roundBet += extra;
        room.pot        += extra;
        player.chips     = 0;
        player.status    = 'allIn';
        player.acted     = true;
        if (player.roundBet > room.currentBet) {
          room.currentBet = player.roundBet;
          for (const p of activePlayers(room)) if (p.userId !== player.userId) p.acted = false;
        }
      }

      room.currentIdx = nextActive(room, room.currentIdx);
      checkRoundEnd(room, ns);
    });

    socket.on('room:leave', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.players = room.players.filter(p => p.socketId !== socket.id);
      socket.leave(roomId);
      if (room.players.length === 0) rooms.delete(roomId);
      else ns.to(roomId).emit('game:state', sanitizeRoom(room));
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        currentRoom.players = currentRoom.players.filter(p => p.socketId !== socket.id);
        if (currentRoom.players.length === 0) rooms.delete(currentRoom.id);
        else ns.to(currentRoom.id).emit('game:state', sanitizeRoom(currentRoom));
      }
    });
  });
};
