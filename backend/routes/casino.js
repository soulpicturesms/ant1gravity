const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// ── Card utilities ────────────────────────────────────────────────────────────
const SUITS  = ['♠', '♥', '♦', '♣'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function newDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push({ suit: s, value: v });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handTotal(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.value === 'A') { aces++; total += 11; }
    else if (['J','Q','K'].includes(c.value)) total += 10;
    else total += parseInt(c.value);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

// ── In-memory session store ───────────────────────────────────────────────────
const sessions = new Map();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of sessions) if (v.ts < cutoff) sessions.delete(k);
}, 5 * 60 * 1000);

// ── BLACKJACK ─────────────────────────────────────────────────────────────────

router.post('/blackjack/start', requireAuth, async (req, res) => {
  const bet = parseInt(req.body.bet);
  if (!bet || bet < 10) return res.status(400).json({ error: 'Apuesta mínima: 10 tokens' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < bet) return res.status(400).json({ error: 'Tokens insuficientes' });

  const deck = newDeck();
  const playerCards = [deck.pop(), deck.pop()];
  const dealerCards = [deck.pop(), deck.pop()];
  const playerTotal  = handTotal(playerCards);

  await supabase.from('users').update({ coins: user.coins - bet }).eq('id', req.user.id);

  const id = crypto.randomUUID();
  sessions.set(id, { id, userId: req.user.id, bet, deck, playerCards, dealerCards, ts: Date.now() });

  if (playerTotal === 21) {
    const fin = await finishBlackjack(id, user, 'blackjack');
    return res.json({ ...fin, sessionId: id });
  }

  res.json({
    sessionId: id,
    playerCards, playerTotal,
    dealerCards: [dealerCards[0], null],
    dealerVisible: handTotal([dealerCards[0]]),
    status: 'playing',
    balance: user.coins - bet,
  });
});

router.post('/blackjack/split', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id) return res.status(400).json({ error: 'Sesión inválida' });
  if (s.isSplit) return res.status(400).json({ error: 'Ya has dividido las cartas' });
  if (s.playerCards.length !== 2 || s.playerCards[0].value !== s.playerCards[1].value)
    return res.status(400).json({ error: 'Las cartas deben ser iguales para dividir' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < s.bet) return res.status(400).json({ error: 'Tokens insuficientes para dividir' });

  // Deduct the second bet
  await supabase.from('users').update({ coins: user.coins - s.bet }).eq('id', req.user.id);

  s.isSplit = true;
  s.hands = [ [s.playerCards[0]], [s.playerCards[1]] ];
  s.handBets = [s.bet, s.bet];
  s.activeHandIdx = 0;
  
  // Deal second card to hand 0
  s.hands[0].push(s.deck.pop());

  res.json({
    isSplit: true,
    hands: s.hands,
    handBets: s.handBets,
    activeHandIdx: 0,
    handTotals: [handTotal(s.hands[0]), handTotal(s.hands[1])],
    status: 'playing',
    balance: user.coins - s.bet
  });
});

router.post('/blackjack/hit', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id) return res.status(400).json({ error: 'Sesión inválida' });

  if (s.isSplit) {
    s.hands[s.activeHandIdx].push(s.deck.pop());
    const total = handTotal(s.hands[s.activeHandIdx]);
    
    if (total >= 21) {
      if (s.activeHandIdx === 0) {
        // Move to Hand 1
        s.activeHandIdx = 1;
        s.hands[1].push(s.deck.pop());
        const total1 = handTotal(s.hands[1]);
        if (total1 >= 21) {
          // Both hands completed! Finish game
          const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
          return res.json(await finishBlackjack(s.id, user, 'stand'));
        }
        return res.json({
          isSplit: true,
          hands: s.hands,
          handBets: s.handBets,
          activeHandIdx: 1,
          handTotals: [handTotal(s.hands[0]), total1],
          status: 'playing'
        });
      } else {
        // Hand 1 completed, finish game
        const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
        return res.json(await finishBlackjack(s.id, user, 'stand'));
      }
    }
    
    return res.json({
      isSplit: true,
      hands: s.hands,
      handBets: s.handBets,
      activeHandIdx: s.activeHandIdx,
      handTotals: [handTotal(s.hands[0]), handTotal(s.hands[1])],
      status: 'playing'
    });
  }

  s.playerCards.push(s.deck.pop());
  const total = handTotal(s.playerCards);

  if (total >= 21) {
    const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
    return res.json(await finishBlackjack(s.id, user, total > 21 ? 'bust' : 'stand'));
  }
  res.json({ playerCards: s.playerCards, playerTotal: total, status: 'playing' });
});

router.post('/blackjack/stand', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id) return res.status(400).json({ error: 'Sesión inválida' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();

  if (s.isSplit) {
    if (s.activeHandIdx === 0) {
      // Move to Hand 1
      s.activeHandIdx = 1;
      s.hands[1].push(s.deck.pop());
      const total1 = handTotal(s.hands[1]);
      if (total1 >= 21) {
        // Hand 1 completes instantly. Finish game
        return res.json(await finishBlackjack(s.id, user, 'stand'));
      }
      return res.json({
        isSplit: true,
        hands: s.hands,
        handBets: s.handBets,
        activeHandIdx: 1,
        handTotals: [handTotal(s.hands[0]), total1],
        status: 'playing'
      });
    } else {
      // Both hands stood. Finish game
      return res.json(await finishBlackjack(s.id, user, 'stand'));
    }
  }

  res.json(await finishBlackjack(s.id, user, 'stand'));
});

router.post('/blackjack/double', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id) return res.status(400).json({ error: 'Sesión inválida' });

  if (s.isSplit) {
    const activeHandCards = s.hands[s.activeHandIdx];
    if (activeHandCards.length !== 2) return res.status(400).json({ error: 'No se puede doblar' });

    const handBet = s.handBets[s.activeHandIdx];
    const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
    if (!user || user.coins < handBet) return res.status(400).json({ error: 'Tokens insuficientes' });

    await supabase.from('users').update({ coins: user.coins - handBet }).eq('id', req.user.id);
    s.handBets[s.activeHandIdx] *= 2;
    activeHandCards.push(s.deck.pop());
    
    // Double gets exactly one card and then finishes the hand
    if (s.activeHandIdx === 0) {
      s.activeHandIdx = 1;
      s.hands[1].push(s.deck.pop());
      const total1 = handTotal(s.hands[1]);
      if (total1 >= 21) {
        return res.json(await finishBlackjack(s.id, { ...user, coins: user.coins - handBet }, 'stand'));
      }
      return res.json({
        isSplit: true,
        hands: s.hands,
        handBets: s.handBets,
        activeHandIdx: 1,
        handTotals: [handTotal(s.hands[0]), total1],
        status: 'playing',
        balance: user.coins - handBet
      });
    } else {
      return res.json(await finishBlackjack(s.id, { ...user, coins: user.coins - handBet }, 'stand'));
    }
  }

  if (s.playerCards.length !== 2)
    return res.status(400).json({ error: 'No se puede doblar' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < s.bet) return res.status(400).json({ error: 'Tokens insuficientes' });

  await supabase.from('users').update({ coins: user.coins - s.bet }).eq('id', req.user.id);
  s.bet *= 2;
  s.playerCards.push(s.deck.pop());
  const total = handTotal(s.playerCards);
  res.json(await finishBlackjack(s.id, { ...user, coins: user.coins - s.bet / 2 }, total > 21 ? 'bust' : 'stand'));
});

async function finishBlackjack(id, user, trigger) {
  const s = sessions.get(id);
  sessions.delete(id);

  if (s.isSplit) {
    const tot0 = handTotal(s.hands[0]);
    const tot1 = handTotal(s.hands[1]);
    
    // Dealer draws to 17 if at least one hand is active (<= 21)
    const atLeastOneHandActive = tot0 <= 21 || tot1 <= 21;
    while (atLeastOneHandActive && handTotal(s.dealerCards) < 17) {
      s.dealerCards.push(s.deck.pop());
    }
    
    const dealerTotal = handTotal(s.dealerCards);
    
    // Evaluate Hand 0
    let res0 = 'lose', payout0 = 0;
    if (tot0 <= 21) {
      if (dealerTotal > 21 || tot0 > dealerTotal) {
        res0 = 'win';
        payout0 = s.handBets[0] * 2;
      } else if (tot0 === dealerTotal) {
        res0 = 'push';
        payout0 = s.handBets[0];
      }
    } else {
      res0 = 'bust';
    }

    // Evaluate Hand 1
    let res1 = 'lose', payout1 = 0;
    if (tot1 <= 21) {
      if (dealerTotal > 21 || tot1 > dealerTotal) {
        res1 = 'win';
        payout1 = s.handBets[1] * 2;
      } else if (tot1 === dealerTotal) {
        res1 = 'push';
        payout1 = s.handBets[1];
      }
    } else {
      res1 = 'bust';
    }

    const totalPayout = payout0 + payout1;
    const totalBet = s.handBets[0] + s.handBets[1];
    const netGain = totalPayout - totalBet;

    if (totalPayout > 0) {
      await supabase.from('users').update({ coins: (user.coins || 0) + totalPayout }).eq('id', s.userId);
    }

    const labels = { win: 'Ganó', push: 'Empate', lose: 'Perdió', bust: 'Pasó' };
    await supabase.from('coin_transactions').insert({
      user_id: s.userId, username: user.username,
      amount: netGain, type: 'casino',
      reason: `Blackjack Split — Mano 1: ${labels[res0]}, Mano 2: ${labels[res1]} (apuesta total: ${totalBet})`,
    });

    return {
      isSplit: true,
      hands: s.hands,
      handBets: s.handBets,
      handTotals: [tot0, tot1],
      handResults: [res0, res1],
      dealerCards: s.dealerCards,
      dealerTotal,
      payout: totalPayout,
      status: 'done',
      balance: (user.coins || 0) + totalPayout,
    };
  }

  // Dealer plays to 17 (standard non-split)
  while (trigger !== 'bust' && handTotal(s.dealerCards) < 17)
    s.dealerCards.push(s.deck.pop());

  const playerTotal = handTotal(s.playerCards);
  const dealerTotal = handTotal(s.dealerCards);

  let result, payout = 0;
  if (trigger === 'bust')                           { result = 'lose'; }
  else if (trigger === 'blackjack')                 { result = 'blackjack'; payout = Math.floor(s.bet * 2.5); }
  else if (dealerTotal > 21 || playerTotal > dealerTotal) { result = 'win';  payout = s.bet * 2; }
  else if (playerTotal === dealerTotal)             { result = 'push'; payout = s.bet; }
  else                                              { result = 'lose'; }

  if (payout > 0) await supabase.from('users').update({ coins: (user.coins || 0) + payout }).eq('id', s.userId);

  const labels = { win: 'Ganó', blackjack: '¡Blackjack!', push: 'Empate', lose: 'Perdió' };
  await supabase.from('coin_transactions').insert({
    user_id: s.userId, username: user.username,
    amount: payout - s.bet, type: 'casino',
    reason: `Blackjack — ${labels[result]} (apuesta: ${s.bet})`,
  });

  return {
    playerCards: s.playerCards, playerTotal,
    dealerCards: s.dealerCards, dealerTotal,
    result, payout, status: 'done',
    balance: (user.coins || 0) + payout,
  };
}

// ── ROULETTE ──────────────────────────────────────────────────────────────────
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const AMERICAN_POCKETS = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1',
  '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'
];

router.post('/roulette/spin', requireAuth, async (req, res) => {
  const { bets } = req.body;
  if (!Array.isArray(bets) || !bets.length) return res.status(400).json({ error: 'Sin apuestas' });

  const totalBet = bets.reduce((s, b) => s + (parseInt(b.amount) || 0), 0);
  if (totalBet <= 0) return res.status(400).json({ error: 'Apuesta inválida' });
  if (totalBet > 100000) return res.status(400).json({ error: 'Apuesta máxima total: 100.000 tokens' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < totalBet) return res.status(400).json({ error: 'Tokens insuficientes' });

  // Spin American Roulette
  const pocketIndex = Math.floor(Math.random() * 38);
  const winningPocket = AMERICAN_POCKETS[pocketIndex]; // String e.g. '0', '00', '1'...'36'
  
  const isGreen = winningPocket === '0' || winningPocket === '00';
  const color = isGreen ? 'green' : RED_NUMS.has(parseInt(winningPocket)) ? 'red' : 'black';

  let totalPayout = 0;
  const results = [];

  for (const b of bets) {
    const amount = parseInt(b.amount) || 0;
    if (!amount) continue;
    let mult = 0;

    if (b.type === 'number') {
      if (b.value === winningPocket) mult = 36;
    } else if (b.type === 'split') {
      const nums = b.value.split(',');
      if (nums.includes(winningPocket)) mult = 18;
    } else if (b.type === 'corner') {
      const nums = b.value.split(',');
      if (nums.includes(winningPocket)) mult = 9;
    } else if (!isGreen) {
      const numVal = parseInt(winningPocket);
      if (b.type === 'color' && b.value === color) mult = 2;
      else if (b.type === 'parity' && (b.value === 'even') === (numVal % 2 === 0)) mult = 2;
      else if (b.type === 'half' && (b.value === 'low') === (numVal <= 18)) mult = 2;
      else if (b.type === 'dozen') {
        const map = { 
          '1-12': n => n >= 1 && n <= 12, 
          '13-24': n => n >= 13 && n <= 24, 
          '25-36': n => n >= 25 && n <= 36 
        };
        if (map[b.value]?.(numVal)) mult = 3;
      } else if (b.type === 'column') {
        const map = { 
          '1': n => n % 3 === 1, 
          '2': n => n % 3 === 2, 
          '3': n => n % 3 === 0 
        };
        if (map[b.value]?.(numVal)) mult = 3;
      }
    }

    const payout = Math.floor(amount * mult);
    totalPayout += payout;
    results.push({ ...b, payout, won: mult > 0 });
  }

  const net = totalPayout - totalBet;
  await supabase.from('users').update({ coins: user.coins + net }).eq('id', req.user.id);
  await supabase.from('coin_transactions').insert({
    user_id: req.user.id, username: user.username,
    amount: net, type: 'casino',
    reason: `Ruleta Casino — nro ${winningPocket} (${color}) ${net >= 0 ? '+' : ''}${net}`,
  });

  res.json({ number: winningPocket, color, results, totalPayout, net, balance: user.coins + net });
});

// ── PLINKO ────────────────────────────────────────────────────────────────────
const PLINKO_MULTIPLIERS = {
  bajo:  [10.0, 2.0, 1.5, 1.1, 0.8, 0.5, 0.5, 0.5, 0.8, 1.1, 1.5, 2.0, 10.0],
  medio: [40.0, 10.0, 3.0, 1.5, 0.8, 0.3, 0.2, 0.3, 0.8, 1.5, 3.0, 10.0, 40.0],
  alto:  [260.0, 30.0, 6.0, 2.0, 0.7, 0.2, 0.0, 0.2, 0.7, 2.0, 6.0, 30.0, 260.0],
};

router.post('/plinko/drop', requireAuth, async (req, res) => {
  const bet = parseInt(req.body.bet);
  const risk = req.body.risk || 'medio';

  if (!bet || bet < 10) return res.status(400).json({ error: 'Apuesta mínima: 10 tokens' });
  if (bet > 10000) return res.status(400).json({ error: 'Apuesta máxima: 10.000 tokens' });
  if (!['bajo', 'medio', 'alto'].includes(risk)) return res.status(400).json({ error: 'Riesgo inválido' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < bet) return res.status(400).json({ error: 'Tokens insuficientes' });

  const rows = 12;
  const path = [];
  let bucket = 0;

  for (let i = 0; i < rows; i++) {
    const choice = Math.random() < 0.5 ? 0 : 1;
    path.push(choice);
    bucket += choice;
  }

  const multipliers = PLINKO_MULTIPLIERS[risk];
  const baseMultiplier = multipliers[bucket];
  const betFactor = 1 + Math.min(1.0, Math.log10(bet / 10) * 0.2);
  const multiplier = parseFloat((baseMultiplier * betFactor).toFixed(1));
  const payout = Math.floor(bet * multiplier);
  const net = payout - bet;

  await supabase.from('users').update({ coins: user.coins + net }).eq('id', req.user.id);
  await supabase.from('coin_transactions').insert({
    user_id: req.user.id,
    username: user.username,
    amount: net,
    type: 'casino',
    reason: `Plinko — riesgo ${risk.toUpperCase()} (x${multiplier}) ${net >= 0 ? '+' : ''}${net}`,
  });

  res.json({
    path,
    bucket,
    multiplier,
    payout,
    net,
    balance: user.coins + net,
  });
});

// ── SLOTS (TRAGAPERRAS) ───────────────────────────────────────────────────────
let inMemoryJackpot = 50000;

router.get('/slots/jackpot', async (req, res) => {
  try {
    const { data: jp } = await supabase.from('casino_jackpot').select('amount').eq('id', 'global').maybeSingle();
    return res.json({ jackpot: jp ? jp.amount : inMemoryJackpot });
  } catch (e) {
    return res.json({ jackpot: inMemoryJackpot });
  }
});

const SLOTS_SYMBOLS = ['Wild', 'Seven', 'Diamond', 'Bell', 'Plum', 'Orange', 'Lemon', 'Cherry'];
const SLOTS_WEIGHTS = [3, 4, 6, 8, 12, 15, 18, 20]; // Rare to common

function getRandomSlotsSymbol() {
  const totalWeight = SLOTS_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < SLOTS_SYMBOLS.length; i++) {
    if (r < SLOTS_WEIGHTS[i]) return SLOTS_SYMBOLS[i];
    r -= SLOTS_WEIGHTS[i];
  }
  return SLOTS_SYMBOLS[SLOTS_SYMBOLS.length - 1];
}

const SLOTS_PAYLINES = [
  [1, 1, 1, 1, 1], // Line 1: Middle Row
  [0, 0, 0, 0, 0], // Line 2: Top Row
  [2, 2, 2, 2, 2], // Line 3: Bottom Row
  [0, 1, 2, 1, 0], // Line 4: V Shape
  [2, 1, 0, 1, 2], // Line 5: Inverted V
  [0, 0, 1, 0, 0], // Line 6: Zigzag top
  [2, 2, 1, 2, 2], // Line 7: Zigzag bottom
  [1, 0, 1, 2, 1], // Line 8: Wave top
  [1, 2, 1, 0, 1], // Line 9: Wave bottom
];

const SLOTS_PAYTABLE = {
  Seven:   { 3: 25, 4: 100, 5: 'JACKPOT' },
  Diamond: { 3: 15, 4: 50,  5: 200 },
  Bell:    { 3: 10, 4: 30,  5: 100 },
  Plum:    { 3: 5,  4: 15,  5: 50 },
  Orange:  { 3: 4,  4: 10,  5: 30 },
  Lemon:   { 3: 3,  4: 8,   5: 20 },
  Cherry:  { 2: 1,  3: 2,   4: 5,   5: 15 },
  Wild:    { 3: 50, 4: 200, 5: 1000 }
};

router.post('/slots/spin', requireAuth, async (req, res) => {
  const bet = parseInt(req.body.bet);
  if (!bet || bet < 9) return res.status(400).json({ error: 'Apuesta mínima: 9 tokens (1 por línea)' });
  if (bet > 10000) return res.status(400).json({ error: 'Apuesta máxima: 10.000 tokens' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < bet) return res.status(400).json({ error: 'Tokens insuficientes' });

  // Get current jackpot
  let jackpotAmount = 50000;
  let useMemory = false;
  try {
    const { data: jp } = await supabase.from('casino_jackpot').select('amount').eq('id', 'global').maybeSingle();
    if (jp) {
      jackpotAmount = jp.amount;
    } else {
      await supabase.from('casino_jackpot').insert({ id: 'global', amount: 50000 }).catch(()=>{});
    }
  } catch (e) {
    console.error('Database jackpot fetch error:', e.message);
    jackpotAmount = inMemoryJackpot;
    useMemory = true;
  }

  // Contribute 2% to jackpot
  const contribution = Math.max(1, Math.floor(bet * 0.02));
  jackpotAmount += contribution;

  // Generate 5 reels x 3 symbols
  const reels = [];
  for (let c = 0; c < 5; c++) {
    const col = [getRandomSlotsSymbol(), getRandomSlotsSymbol(), getRandomSlotsSymbol()];
    reels.push(col);
  }

  const betPerLine = bet / 9.0;
  let totalPayout = 0;
  let jackpotWon = false;
  const winningLines = []; // [{ lineIndex, symbol, count, payout, positions: [[col, row], ...] }]

  // Evaluate the 9 paylines
  for (let lIndex = 0; lIndex < SLOTS_PAYLINES.length; lIndex++) {
    const lineCoords = SLOTS_PAYLINES[lIndex]; // e.g. [1, 1, 1, 1, 1] means middle row across all reels
    const lineSymbols = [
      reels[0][lineCoords[0]],
      reels[1][lineCoords[1]],
      reels[2][lineCoords[2]],
      reels[3][lineCoords[3]],
      reels[4][lineCoords[4]],
    ];

    let bestSymbol = null;
    let bestCount = 0;
    let bestStartIdx = 0;
    let bestPayoutType = 0;

    // Check pure Wilds from left to right
    let wildCount = 0;
    for (let i = 0; i < 5; i++) {
      if (lineSymbols[i] === 'Wild') wildCount++;
      else break;
    }
    if (wildCount >= 3) {
      bestSymbol = 'Wild';
      bestCount = wildCount;
      bestStartIdx = 0;
      bestPayoutType = SLOTS_PAYTABLE.Wild[wildCount] || 0;
    }

    // Check other symbols from left to right (with Wild as wildcard)
    for (const S of ['Seven', 'Diamond', 'Bell', 'Plum', 'Orange', 'Lemon', 'Cherry']) {
      let count = 0;
      for (let i = 0; i < 5; i++) {
        if (lineSymbols[i] === S || lineSymbols[i] === 'Wild') count++;
        else break;
      }

      if (count >= 2) {
        const mult = SLOTS_PAYTABLE[S][count];
        if (mult) {
          if (mult === 'JACKPOT') {
            bestSymbol = S;
            bestCount = count;
            bestStartIdx = 0;
            bestPayoutType = 'JACKPOT';
            break;
          } else if (bestPayoutType !== 'JACKPOT' && mult > bestPayoutType) {
            bestSymbol = S;
            bestCount = count;
            bestStartIdx = 0;
            bestPayoutType = mult;
          }
        }
      }
    }

    if (bestPayoutType === 'JACKPOT') {
      jackpotWon = true;
      const positions = lineCoords.map((row, col) => [col, row]);
      winningLines.push({
        lineIndex: lIndex,
        symbol: bestSymbol,
        count: bestCount,
        payout: jackpotAmount, // raw payout is jackpot
        isJackpot: true,
        positions
      });
    } else if (bestPayoutType > 0) {
      const linePayout = Math.floor(betPerLine * bestPayoutType);
      totalPayout += linePayout;
      const positions = [];
      for (let col = 0; col < bestCount; col++) {
        positions.push([col, lineCoords[col]]);
      }
      winningLines.push({
        lineIndex: lIndex,
        symbol: bestSymbol,
        count: bestCount,
        payout: linePayout,
        isJackpot: false,
        positions
      });
    }
  }

  let finalPayout = totalPayout;
  if (jackpotWon) {
    finalPayout += jackpotAmount;
    // Reset jackpot to 50000
    jackpotAmount = 50000;
  }

  // Update jackpot in db
  if (useMemory) {
    inMemoryJackpot = jackpotAmount;
  } else {
    try {
      await supabase.from('casino_jackpot').update({ amount: jackpotAmount }).eq('id', 'global');
    } catch (e) {
      console.error('Database jackpot update error:', e.message);
      inMemoryJackpot = jackpotAmount;
    }
  }

  // Update user coins
  const net = finalPayout - bet;
  const newBalance = user.coins + net;
  await supabase.from('users').update({ coins: newBalance }).eq('id', req.user.id);

  // Log transaction
  let reason = `Tragaperras — Apuesta: ${bet}. Ganancia: ${finalPayout}`;
  if (jackpotWon) {
    reason += ` ¡¡MEGA JACKPOT GANADO!!`;
  }
  await supabase.from('coin_transactions').insert({
    user_id: req.user.id,
    username: user.username,
    amount: net,
    type: 'casino',
    reason,
  });

  res.json({
    reels,
    winningLines,
    payout: finalPayout,
    net,
    jackpotWon,
    jackpotAmount: jackpotWon ? finalPayout - totalPayout : jackpotAmount,
    balance: newBalance,
  });
});

// ── GAME HISTORY (per user, auth required) ────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('amount, reason, created_at')
    .eq('type', 'casino')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── BIGGEST LOSSES (public, room-wide) ────────────────────────────────────────
router.get('/biggest-losses', async (req, res) => {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('username, amount, reason, created_at')
    .eq('type', 'casino')
    .lt('amount', 0)
    .order('amount', { ascending: true })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── RECENT WINS (public) ──────────────────────────────────────────────────────
router.get('/recent-wins', async (req, res) => {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('username, amount, reason, created_at')
    .eq('type', 'casino')
    .gt('amount', 0)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

module.exports = router;
