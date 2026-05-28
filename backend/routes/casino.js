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

router.post('/blackjack/hit', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id) return res.status(400).json({ error: 'Sesión inválida' });

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
  res.json(await finishBlackjack(s.id, user, 'stand'));
});

router.post('/blackjack/double', requireAuth, async (req, res) => {
  const s = sessions.get(req.body.sessionId);
  if (!s || s.userId !== req.user.id || s.playerCards.length !== 2)
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

  // Dealer plays to 17
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

router.post('/roulette/spin', requireAuth, async (req, res) => {
  const { bets } = req.body;
  if (!Array.isArray(bets) || !bets.length) return res.status(400).json({ error: 'Sin apuestas' });

  const totalBet = bets.reduce((s, b) => s + (parseInt(b.amount) || 0), 0);
  if (totalBet <= 0) return res.status(400).json({ error: 'Apuesta inválida' });

  const { data: user } = await supabase.from('users').select('coins,username').eq('id', req.user.id).maybeSingle();
  if (!user || user.coins < totalBet) return res.status(400).json({ error: 'Tokens insuficientes' });

  const number = Math.floor(Math.random() * 37);
  const color  = number === 0 ? 'green' : RED_NUMS.has(number) ? 'red' : 'black';

  let totalPayout = 0;
  const results = [];

  for (const b of bets) {
    const amount = parseInt(b.amount) || 0;
    if (!amount) continue;
    let mult = 0;
    if (b.type === 'number' && parseInt(b.value) === number) mult = 36;
    else if (b.type === 'color'  && b.value === color && number !== 0) mult = 2;
    else if (b.type === 'parity' && number !== 0 && (b.value === 'even') === (number % 2 === 0)) mult = 2;
    else if (b.type === 'half'   && number !== 0 && (b.value === 'low') === (number <= 18)) mult = 2;
    else if (b.type === 'dozen') {
      const map = { '1-12': n => n >= 1&&n <= 12, '13-24': n => n >= 13&&n <= 24, '25-36': n => n >= 25&&n <= 36 };
      if (map[b.value]?.(number)) mult = 3;
    } else if (b.type === 'column' && number !== 0) {
      const map = { '1': n => n % 3 === 1, '2': n => n % 3 === 2, '3': n => n % 3 === 0 };
      if (map[b.value]?.(number)) mult = 3;
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
    reason: `Ruleta Casino — nro ${number} (${color}) ${net >= 0 ? '+' : ''}${net}`,
  });

  res.json({ number, color, results, totalPayout, net, balance: user.coins + net });
});

module.exports = router;
