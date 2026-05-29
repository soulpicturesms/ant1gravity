const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// ─── Game Logic ───────────────────────────────────────────────────────────────
const SUITS  = ['♠','♥','♦','♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VAL_RANK = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};

function newDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push({suit:s,value:v});
  for (let i = d.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [d[i],d[j]] = [d[j],d[i]];
  }
  return d;
}

function evaluateHand(cards) {
  const ranks = cards.map(c => VAL_RANK[c.value]||0).sort((a,b)=>b-a);
  const suits = cards.map(c => c.suit);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r]||0)+1;
  const freq = Object.entries(counts).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const isFlush = suits.every(s=>s===suits[0]);
  const isStr   = ranks.length===5 && ranks[0]-ranks[4]===4 && new Set(ranks).size===5;
  const isLowA  = JSON.stringify(ranks)===JSON.stringify([14,5,4,3,2]);
  if (isFlush&&(isStr||isLowA)) { const h=isLowA?5:ranks[0]; return {rank:h===14?9:8,name:h===14?'Royal Flush':'Straight Flush',tiebreakers:[h]}; }
  if (freq[0][1]===4) return {rank:7,name:'Póker',tiebreakers:freq.map(([r])=>+r)};
  if (freq[0][1]===3&&freq[1]?.[1]===2) return {rank:6,name:'Full House',tiebreakers:freq.map(([r])=>+r)};
  if (isFlush) return {rank:5,name:'Color',tiebreakers:ranks};
  if (isStr||isLowA) return {rank:4,name:'Escalera',tiebreakers:[isLowA?5:ranks[0]]};
  if (freq[0][1]===3) return {rank:3,name:'Trío',tiebreakers:freq.map(([r])=>+r)};
  if (freq[0][1]===2&&freq[1]?.[1]===2) return {rank:2,name:'Doble Par',tiebreakers:freq.map(([r])=>+r)};
  if (freq[0][1]===2) return {rank:1,name:'Par',tiebreakers:freq.map(([r])=>+r)};
  return {rank:0,name:'Carta Alta',tiebreakers:ranks};
}

function combos(arr, k) {
  if (k===0) return [[]];
  if (arr.length<k) return [];
  const [h,...t] = arr;
  return [...combos(t,k-1).map(c=>[h,...c]),...combos(t,k)];
}

function compareTb(a,b) {
  for (let i=0;i<Math.max(a.length,b.length);i++) { const d=(a[i]||0)-(b[i]||0); if(d!==0) return d; }
  return 0;
}

function bestHand(hole, community) {
  let best=null;
  for (const combo of combos([...hole,...community],5)) {
    const h=evaluateHand(combo);
    if (!best||h.rank>best.rank||(h.rank===best.rank&&compareTb(h.tiebreakers,best.tiebreakers)>0)) best={...h};
  }
  return best;
}

function activePlayers(players) { return players.filter(p=>p.status==='active'); }

function nextActive(players, from) {
  let idx=(from+1)%players.length, tries=0;
  while (players[idx]?.status!=='active'&&tries<players.length) { idx=(idx+1)%players.length; tries++; }
  return idx;
}

function postBlind(state, idx, amount) {
  const p=state.players[idx]; if(!p) return;
  const paid=Math.min(amount,p.chips);
  p.chips-=paid; p.roundBet=paid; state.pot+=paid;
  if(p.chips===0) p.status='allIn';
}

function publicState(state) {
  const {_deck,...rest} = state;
  return {
    ...rest,
    players: state.players.map(p=>({...p,holeCards:p.holeCards?p.holeCards.map(()=>null):[]})),
  };
}

function startHand(state) {
  state.players = state.players.filter(p=>p.chips>0);
  if (state.players.length<2) { state.status='waiting'; state.phase='waiting'; state.showdown=null; return; }
  const deck=newDeck();
  Object.assign(state, {phase:'preflop',status:'playing',community:[],pot:0,currentBet:0,showdown:null,dealerIdx:((state.dealerIdx||0)+1)%state.players.length});
  for (const p of state.players) Object.assign(p, {status:'active',roundBet:0,acted:false,holeCards:[deck.pop(),deck.pop()],bestHand:null});
  const sbIdx=(state.dealerIdx+1)%state.players.length;
  const bbIdx=(state.dealerIdx+2)%state.players.length;
  const sbAmt=Math.floor(state.buyIn/2), bbAmt=state.buyIn;
  postBlind(state,sbIdx,sbAmt); postBlind(state,bbIdx,bbAmt);
  state.currentBet=bbAmt; state.minRaise=bbAmt;
  state.currentIdx=(bbIdx+1)%state.players.length;
  state._deck=deck;
}

function doShowdown(state) {
  const acts=activePlayers(state.players);
  let winner=null,bestResult=null;
  for (const p of acts) {
    const h=bestHand(p.holeCards,state.community);
    p.bestHand=h;
    if (!bestResult||h.rank>bestResult.rank||(h.rank===bestResult.rank&&compareTb(h.tiebreakers,bestResult.tiebreakers)>0)) { bestResult=h; winner=p; }
  }
  if (winner) winner.chips+=state.pot;
  state.phase='showdown'; state.status='showdown';
  state.showdown={
    players:acts.map(p=>({userId:p.userId,username:p.username,holeCards:p.holeCards,bestHand:p.bestHand})),
    winner:{userId:winner?.userId,username:winner?.username,handName:bestResult?.name},
    pot:state.pot,
  };
}

function checkAndAdvance(state) {
  const acts=activePlayers(state.players);
  if (acts.length<=1) {
    const last=acts[0]||state.players.find(p=>p.status==='allIn');
    if(last) last.chips+=state.pot;
    state.phase='showdown'; state.status='showdown';
    state.showdown={players:[],winner:{userId:last?.userId,username:last?.username,handName:'Última en pie'},pot:state.pot};
    return;
  }
  const allActed=acts.every(p=>(p.acted&&p.roundBet===state.currentBet)||p.status==='allIn');
  if (!allActed) return;
  const phases=['preflop','flop','turn','river'];
  const next=phases[phases.indexOf(state.phase)+1];
  if (!next) { doShowdown(state); return; }
  state.phase=next; state.currentBet=0;
  for (const p of state.players) { p.roundBet=0; if(p.status==='active') p.acted=false; }
  const deck=state._deck||[];
  if(next==='flop') state.community.push(deck.pop(),deck.pop(),deck.pop());
  if(next==='turn') state.community.push(deck.pop());
  if(next==='river') state.community.push(deck.pop());
  state._deck=deck;
  state.currentIdx=nextActive(state.players,state.dealerIdx);
}

// ─── DB helpers ────────────────────────────────────────────────────────────────
async function getRoom(id) {
  const {data,error}=await supabase.from('poker_rooms').select('*').eq('id',id).single();
  if(error||!data) throw new Error('Sala no encontrada');
  return data;
}

async function saveRoom(id, state) {
  const pub=publicState(state);
  const {error}=await supabase.from('poker_rooms').update({state:pub,full_state:state,updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw new Error(error.message);
  return pub;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/rooms', async (req,res) => {
  try {
    // Clean up stale rooms
    await supabase.from('poker_rooms').delete().lt('updated_at', new Date(Date.now()-7200000).toISOString());
    const {data,error}=await supabase.from('poker_rooms').select('id,name,state,updated_at').order('updated_at',{ascending:false}).limit(20);
    if(error) throw error;
    res.json(data||[]);
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/rooms', requireAuth, async (req,res) => {
  try {
    const {name='Mesa ANT1',buyIn=100,maxPlayers=6}=req.body;
    const { data: user } = await supabase.from('users').select('albion_avatar, albion_ring').eq('id', req.user.id).maybeSingle();
    const init={
      status:'waiting',
      phase:'waiting',
      players:[{
        userId: req.user.id,
        username: req.user.username,
        albion_avatar: user?.albion_avatar || null,
        albion_ring: user?.albion_ring || null,
        chips: buyIn * 10,
        status: 'waiting',
        holeCards: [],
        roundBet: 0,
        acted: false,
        bestHand: null
      }],
      community:[],
      pot:0,
      currentBet:0,
      currentIdx:0,
      dealerIdx:-1,
      buyIn,
      maxPlayers,
      minRaise:buyIn,
      showdown:null,
      name
    };
    const {data,error}=await supabase.from('poker_rooms').insert({name,buy_in:buyIn,max_players:maxPlayers,state:init,full_state:init}).select().single();
    if(error) throw error;
    res.json(data);
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.get('/rooms/:id', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    const me=state.players.find(p=>p.userId===req.user.id);
    res.json({state:publicState(state),myCards:me?.holeCards||[]});
  } catch(e) { res.status(404).json({error:e.message}); }
});

router.post('/rooms/:id/join', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    if(state.players.length>=state.maxPlayers) return res.status(400).json({error:'Sala llena'});
    if(state.status==='playing') return res.status(400).json({error:'Partida en curso'});
    if(!state.players.find(p=>p.userId===req.user.id)) {
      const { data: user } = await supabase.from('users').select('albion_avatar, albion_ring').eq('id', req.user.id).maybeSingle();
      state.players.push({
        userId:req.user.id,
        username:req.user.username,
        albion_avatar: user?.albion_avatar || null,
        albion_ring: user?.albion_ring || null,
        chips:state.buyIn*10,
        status:'waiting',
        holeCards:[],
        roundBet:0,
        acted:false,
        bestHand:null
      });
    }
    await saveRoom(req.params.id,state);
    const me=state.players.find(p=>p.userId===req.user.id);
    res.json({state:publicState(state),myCards:me?.holeCards||[]});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/rooms/:id/leave', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    state.players=state.players.filter(p=>p.userId!==req.user.id);
    if(state.players.length===0) await supabase.from('poker_rooms').delete().eq('id',req.params.id);
    else await saveRoom(req.params.id,state);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/rooms/:id/start', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    if(state.players.length<2) return res.status(400).json({error:'Se necesitan al menos 2 jugadores'});
    startHand(state);
    await saveRoom(req.params.id,state);
    const me=state.players.find(p=>p.userId===req.user.id);
    res.json({state:publicState(state),myCards:me?.holeCards||[]});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/rooms/:id/action', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    const {action,amount}=req.body;
    if(state.phase==='waiting'||state.phase==='showdown') return res.status(400).json({error:'No es tu turno'});
    const player=state.players[state.currentIdx];
    if(!player||player.userId!==req.user.id) return res.status(400).json({error:'No es tu turno'});
    const callAmt=state.currentBet-player.roundBet;
    if(action==='fold') { player.status='folded'; player.acted=true; }
    else if(action==='check') {
      if(callAmt>0) return res.status(400).json({error:'No podés pasar, hay apuesta'});
      player.acted=true;
    } else if(action==='call') {
      const paid=Math.min(callAmt,player.chips);
      player.chips-=paid; player.roundBet+=paid; state.pot+=paid; player.acted=true;
      if(player.chips===0) player.status='allIn';
    } else if(action==='raise') {
      const total=parseInt(amount);
      if(total<=state.currentBet) return res.status(400).json({error:'Raise debe ser mayor'});
      if(total-state.currentBet>10000) return res.status(400).json({error:'Raise máximo: 10.000 tokens por acción'});
      const extra=total-player.roundBet;
      if(extra>player.chips) return res.status(400).json({error:'Chips insuficientes'});
      player.chips-=extra; player.roundBet=total; state.pot+=extra;
      const oldBet=state.currentBet; state.currentBet=total; state.minRaise=total-oldBet;
      player.acted=true;
      for(const p of activePlayers(state.players)) if(p.userId!==player.userId) p.acted=false;
      if(player.chips===0) player.status='allIn';
    } else if(action==='allin') {
      const extra=player.chips;
      player.roundBet+=extra; state.pot+=extra; player.chips=0; player.status='allIn'; player.acted=true;
      if(player.roundBet>state.currentBet) {
        const oldBet=state.currentBet; state.currentBet=player.roundBet; state.minRaise=state.currentBet-oldBet;
        for(const p of activePlayers(state.players)) if(p.userId!==player.userId) p.acted=false;
      }
    }
    state.currentIdx=nextActive(state.players,state.currentIdx);
    checkAndAdvance(state);
    await saveRoom(req.params.id,state);
    const me=state.players.find(p=>p.userId===req.user.id);
    res.json({state:publicState(state),myCards:me?.holeCards||[]});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/rooms/:id/next-hand', requireAuth, async (req,res) => {
  try {
    const room=await getRoom(req.params.id);
    const state=room.full_state;
    if(state.phase!=='showdown') return res.status(400).json({error:'No está en showdown'});
    startHand(state);
    await saveRoom(req.params.id,state);
    const me=state.players.find(p=>p.userId===req.user.id);
    res.json({state:publicState(state),myCards:me?.holeCards||[]});
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
