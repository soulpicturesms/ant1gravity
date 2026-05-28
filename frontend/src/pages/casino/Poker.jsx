import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api';

// ─── Playing Card ─────────────────────────────────────────────────────────────
const SUIT_RED = new Set(['♥','♦']);

function Card({ card, faceDown = false, size = 'md', style = {} }) {
  const S = {
    sm: { w: 44, h: 62, fs: '0.72rem', ss: '0.9rem', r: 5 },
    md: { w: 60, h: 86, fs: '0.9rem',  ss: '1.3rem', r: 7 },
    lg: { w: 76, h: 108, fs: '1rem',   ss: '1.6rem', r: 8 },
  }[size] || { w: 60, h: 86, fs: '0.9rem', ss: '1.3rem', r: 7 };

  const base = { width: S.w, height: S.h, borderRadius: S.r, flexShrink: 0, ...style };

  if (faceDown || !card) {
    return (
      <div style={{ ...base, background: 'linear-gradient(145deg,#1e3a8a,#1e40af)', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '2px 4px 10px rgba(0,0,0,0.6)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(255,255,255,0.18)', borderRadius: S.r - 2, backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,0.04) 5px,rgba(255,255,255,0.04) 10px)' }} />
      </div>
    );
  }

  const color = SUIT_RED.has(card.suit) ? '#cc1122' : '#0f172a';
  return (
    <div style={{ ...base, background: 'linear-gradient(145deg,#fff,#f4f4f4)', border: '1px solid #d1d5db', boxShadow: '2px 4px 12px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3px 5px', position: 'relative' }}>
      <div style={{ color, lineHeight: 1 }}>
        <div style={{ fontWeight: 800, fontSize: S.fs, fontFamily: 'Georgia,serif' }}>{card.value}</div>
        <div style={{ fontSize: `calc(${S.fs} * 0.85)` }}>{card.suit}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: S.ss, color, lineHeight: 1, fontWeight: 700 }}>{card.suit}</div>
      <div style={{ color, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontWeight: 800, fontSize: S.fs, fontFamily: 'Georgia,serif' }}>{card.value}</div>
        <div style={{ fontSize: `calc(${S.fs} * 0.85)` }}>{card.suit}</div>
      </div>
    </div>
  );
}

// ─── Player Seat ──────────────────────────────────────────────────────────────
function PlayerSeat({ player, isMe, isCurrent, myCards }) {
  const cards = isMe ? (myCards || []) : [];
  const folded = player.status === 'folded';
  const allIn  = player.status === 'allIn';

  return (
    <div style={{
      width: 128, textAlign: 'center', opacity: folded ? 0.5 : 1,
      transition: 'opacity 0.3s, box-shadow 0.3s',
    }}>
      {/* Cards above panel */}
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 4 }}>
        <Card card={isMe ? cards[0] : null} faceDown={!isMe || !cards[0]} size="sm" />
        <Card card={isMe ? cards[1] : null} faceDown={!isMe || !cards[1]} size="sm" />
      </div>

      {/* Info panel */}
      <div style={{
        background: isCurrent ? 'rgba(255,215,0,0.18)' : isMe ? 'rgba(0,212,255,0.12)' : 'rgba(0,0,0,0.55)',
        border: `2px solid ${isCurrent ? '#ffd700' : isMe ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8, padding: '5px 7px',
        boxShadow: isCurrent ? '0 0 18px rgba(255,215,0,0.35), 0 0 40px rgba(255,215,0,0.15)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ fontSize: '0.78rem', fontFamily: 'Rajdhani', fontWeight: 700, color: isCurrent ? '#ffd700' : isMe ? '#00d4ff' : '#e0e0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isCurrent && <span style={{ marginRight: 3 }}>▶</span>}{player.username || '?'}{isMe ? ' (vos)' : ''}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 600 }}>
          ⚡ {(player.chips || 0).toLocaleString('es-AR')}
        </div>
        {folded && <div style={{ fontSize: '0.6rem', color: '#ef4444', fontFamily: 'Rajdhani', fontWeight: 700, marginTop: 1 }}>FOLD</div>}
        {allIn  && <div style={{ fontSize: '0.6rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, marginTop: 1 }}>ALL IN</div>}
        {player.roundBet > 0 && !folded && (
          <div style={{ fontSize: '0.6rem', color: '#a78bfa', fontFamily: 'Rajdhani', marginTop: 1 }}>
            Bet: {player.roundBet.toLocaleString('es-AR')}
          </div>
        )}
        {player.bestHand?.name && (
          <div style={{ fontSize: '0.62rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, marginTop: 2 }}>
            {player.bestHand.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Oval Table layout ────────────────────────────────────────────────────────
// Seat positions for N players: [x%, y%] centered, me always at index 0 (bottom)
const SEAT_POS = {
  1: [[50,92]],
  2: [[50,92],[50,2]],
  3: [[50,92],[10,24],[90,24]],
  4: [[50,92],[4,50],[50,2],[96,50]],
  5: [[50,92],[6,72],[14,8],[86,8],[94,72]],
  6: [[50,92],[5,70],[8,18],[50,2],[92,18],[95,70]],
};

function PokerTable({ players, myUserId, myCards, community, pot, phase, currentIdx, showdown }) {
  const myIdx = players.findIndex(p => p.userId === myUserId);
  const ordered = myIdx >= 0
    ? [...players.slice(myIdx), ...players.slice(0, myIdx)]
    : players;
  const n = Math.min(Math.max(ordered.length, 1), 6);
  const positions = SEAT_POS[n] || SEAT_POS[6];

  // Map original index to current player
  const currentPlayer = players[currentIdx];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 740, margin: '0 auto', height: 540 }}>

      {/* ── Oval felt table ── */}
      <div style={{
        position: 'absolute', left: '14%', right: '14%', top: '13%', bottom: '10%',
        background: 'radial-gradient(ellipse at 50% 38%, #1e7b3c 0%, #176634 45%, #0f5028 75%, #0a3d1e 100%)',
        borderRadius: '50%',
        border: '10px solid #5c3010',
        boxShadow: '0 0 0 3px #9b6d28, 0 8px 60px rgba(0,0,0,0.85), inset 0 2px 60px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        {/* Felt texture overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)', pointerEvents: 'none' }} />

        {/* Phase badge */}
        {phase && phase !== 'waiting' && (
          <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {phase === 'preflop' ? '● PRE-FLOP' : phase === 'flop' ? '● FLOP' : phase === 'turn' ? '● TURN' : phase === 'river' ? '● RIVER' : phase.toUpperCase()}
          </div>
        )}

        {/* Community cards */}
        <div style={{ position: 'absolute', top: '36%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i} card={community?.[i] || null} faceDown={!community?.[i]} size="md" />
          ))}
        </div>

        {/* Pot */}
        <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          {pot > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: 20, padding: '4px 18px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ffd700', whiteSpace: 'nowrap' }}>
              🏆 {pot.toLocaleString('es-AR')} tokens
            </div>
          )}
        </div>

        {/* Showdown result on table */}
        {showdown?.winner && (
          <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ffd700', background: 'rgba(0,0,0,0.7)', padding: '5px 16px', borderRadius: 10, border: '1px solid rgba(255,215,0,0.4)', whiteSpace: 'nowrap' }}>
              🏆 {showdown.winner.username} · {showdown.winner.handName}
            </div>
          </div>
        )}
      </div>

      {/* ── Player seats ── */}
      {ordered.map((player, i) => {
        const [px, py] = positions[i] || [50, 50];
        const isMe = player.userId === myUserId;
        const isCurrent = player.userId === currentPlayer?.userId;
        return (
          <div key={player.userId} style={{
            position: 'absolute',
            left: `${px}%`, top: `${py}%`,
            transform: 'translate(-50%,-50%)',
            zIndex: 2,
          }}>
            <PlayerSeat player={player} isMe={isMe} isCurrent={isCurrent} myCards={isMe ? myCards : []} />
          </div>
        );
      })}

      {/* Empty seat indicator */}
      {ordered.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'Rajdhani', fontSize: '1.1rem', zIndex: 2 }}>
          Esperando jugadores...
        </div>
      )}
    </div>
  );
}

// ─── Room List ────────────────────────────────────────────────────────────────
function RoomList({ onJoin }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState(100);
  const [maxP, setMaxP] = useState(6);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api.pokerGetRooms().then(d => {
      setRooms(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, [load]);

  const create = async () => {
    if (!name.trim()) return setErr('Ingresá un nombre de sala');
    setCreating(true); setErr('');
    try {
      const room = await api.pokerCreateRoom({ name: name.trim(), buyIn, maxPlayers: maxP });
      const res = await api.pokerJoinRoom(room.id);
      onJoin(room.id, res.state, res.myCards);
    } catch (e) { setErr(e.message); }
    finally { setCreating(false); }
  };

  const join = async (id) => {
    try {
      const res = await api.pokerJoinRoom(id);
      onJoin(id, res.state, res.myCards);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#a78bfa', letterSpacing: '0.08em' }}>♠ TEXAS HOLD'EM</div>
          <div style={{ fontSize: '0.78rem', color: '#6a6a8a', fontFamily: 'Rajdhani' }}>Multijugador · Tiempo real</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(s => !s)}>
          {showCreate ? '✕ Cancelar' : '+ Nueva Mesa'}
        </button>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.04)', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#a78bfa', marginBottom: 14 }}>Nueva Mesa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" placeholder="Nombre de la sala..." value={name} onChange={e => setName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#6a6a8a', display: 'block', marginBottom: 4 }}>Buy-in (chips)</label>
                <select className="input" value={buyIn} onChange={e => setBuyIn(Number(e.target.value))}>
                  {[50, 100, 200, 500, 1000].map(v => <option key={v} value={v}>{v.toLocaleString('es-AR')}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#6a6a8a', display: 'block', marginBottom: 4 }}>Máx. jugadores</label>
                <select className="input" value={maxP} onChange={e => setMaxP(Number(e.target.value))}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={create} disabled={creating}>{creating ? 'Creando...' : 'Crear y Unirme'}</button>
          </div>
        </div>
      )}

      {/* Room list */}
      {loading && <div className="loading"><div className="spinner" /> Cargando salas...</div>}
      {!loading && rooms.length === 0 && !showCreate && (
        <div className="empty">
          <div className="empty-icon">♠</div>
          <p>No hay mesas activas.<br />¡Creá una nueva!</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rooms.map(r => {
          const s = r.state || {};
          const playerCount = s.players?.length || 0;
          const isFull = playerCount >= (s.maxPlayers || 6);
          const isPlaying = s.status === 'playing';
          return (
            <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid rgba(167,139,250,0.15)' }}>
              <div>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: 'white' }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginTop: 3, fontFamily: 'Rajdhani' }}>
                  Buy-in: {(s.buyIn || 100).toLocaleString('es-AR')} chips · {playerCount}/{s.maxPlayers || 6} jugadores
                  <span style={{ marginLeft: 8, color: isPlaying ? '#ffd700' : '#00cc66' }}>● {isPlaying ? 'En juego' : 'Esperando'}</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => join(r.id)}
                disabled={isFull || isPlaying}
                style={{ flexShrink: 0 }}
              >
                {isPlaying ? 'En juego' : isFull ? 'Llena' : 'Unirse →'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Poker Component ─────────────────────────────────────────────────────
export default function Poker({ user }) {
  const [view, setView]       = useState('lobby'); // 'lobby' | 'game'
  const [roomId, setRoomId]   = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [raiseAmt, setRaiseAmt] = useState('');
  const [err, setErr]         = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const nextHandTimer = useRef(null);

  // ── Polling ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || view !== 'game') return;
    const poll = async () => {
      try {
        const res = await api.pokerGetRoom(roomId);
        setGameState(res.state);
        if (res.myCards?.length) setMyCards(res.myCards);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [roomId, view]);

  // ── Auto next-hand after showdown ────────────────────────────────────────────
  useEffect(() => {
    if (gameState?.phase === 'showdown' && !nextHandTimer.current) {
      nextHandTimer.current = setTimeout(async () => {
        nextHandTimer.current = null;
        try {
          const res = await api.pokerNextHand(roomId);
          setGameState(res.state);
          if (res.myCards?.length) setMyCards(res.myCards);
        } catch {}
      }, 5500);
    }
    if (gameState?.phase !== 'showdown') {
      clearTimeout(nextHandTimer.current);
      nextHandTimer.current = null;
    }
    return () => {};
  }, [gameState?.phase, roomId]);

  const handleJoin = (id, state, cards) => {
    setRoomId(id);
    setGameState(state);
    setMyCards(cards || []);
    setErr('');
    setView('game');
  };

  const handleLeave = async () => {
    clearTimeout(nextHandTimer.current);
    nextHandTimer.current = null;
    try { await api.pokerLeaveRoom(roomId); } catch {}
    setView('lobby'); setRoomId(null); setGameState(null); setMyCards([]);
  };

  const doAction = async (action, amount) => {
    setActionLoading(true); setErr('');
    try {
      const res = await api.pokerAction(roomId, { action, amount });
      setGameState(res.state);
      if (res.myCards?.length) setMyCards(res.myCards);
      setRaiseAmt('');
    } catch (e) { setErr(e.message); }
    finally { setActionLoading(false); }
  };

  const doStart = async () => {
    setErr('');
    try {
      const res = await api.pokerStartGame(roomId);
      setGameState(res.state);
      if (res.myCards?.length) setMyCards(res.myCards);
    } catch (e) { setErr(e.message); }
  };

  if (view === 'lobby') return <RoomList onJoin={handleJoin} />;

  const state = gameState || {};
  const players = state.players || [];
  const me = players.find(p => p.userId === user.id);
  const currentPlayer = players[state.currentIdx];
  const isMyTurn = currentPlayer?.userId === user.id && state.phase !== 'waiting' && state.phase !== 'showdown';
  const callAmt = Math.max(0, (state.currentBet || 0) - (me?.roundBet || 0));
  const isWaiting = state.status === 'waiting' || state.phase === 'waiting';
  const canStart = isWaiting && players.length >= 2 && me;
  const isShowdown = state.phase === 'showdown';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#a78bfa' }}>♠ {state.name || 'Mesa Poker'}</span>
          <span style={{ marginLeft: 12, fontSize: '0.75rem', color: '#6a6a8a', fontFamily: 'Rajdhani' }}>
            Buy-in: {(state.buyIn || 100).toLocaleString('es-AR')} · {players.length}/{state.maxPlayers || 6} jugadores
          </span>
        </div>
        <button onClick={handleLeave} style={{ background: 'transparent', border: '1px solid #1e1e30', color: '#6a6a8a', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Rajdhani' }}>
          ← Salir
        </button>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 10 }}>{err}</div>}

      {/* Showdown banner */}
      {isShowdown && state.showdown?.winner && (
        <div style={{ textAlign: 'center', padding: '12px 20px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: '#ffd700', marginBottom: 6 }}>
            🏆 {state.showdown.winner.username} gana · {state.showdown.winner.handName}!
          </div>
          {state.showdown.players?.length > 0 && (
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {state.showdown.players.map(p => (
                <div key={p.userId} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9090b0', fontFamily: 'Rajdhani' }}>{p.username}</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                    {p.holeCards?.map((c, i) => <Card key={i} card={c} size="sm" />)}
                  </div>
                  {p.bestHand && <div style={{ fontSize: '0.68rem', color: '#a78bfa', marginTop: 3, fontFamily: 'Rajdhani', fontWeight: 700 }}>{p.bestHand.name}</div>}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#4a4a6a', marginTop: 8, fontFamily: 'Rajdhani' }}>Próxima mano en 5s...</div>
        </div>
      )}

      {/* The Poker Table */}
      <PokerTable
        players={players}
        myUserId={user.id}
        myCards={myCards}
        community={state.community}
        pot={state.pot}
        phase={state.phase}
        currentIdx={state.currentIdx}
        showdown={state.showdown}
      />

      {/* My cards (large display) */}
      {myCards.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: -20, marginBottom: 12 }}>
          <div style={{ fontSize: '0.68rem', color: '#6a6a8a', fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 6 }}>TU MANO</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {myCards.map((c, i) => <Card key={i} card={c} size="lg" />)}
          </div>
          {me?.chips !== undefined && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#9090b0', fontFamily: 'Rajdhani' }}>
              Chips: <span style={{ color: '#ffd700', fontWeight: 700 }}>⚡ {(me.chips || 0).toLocaleString('es-AR')}</span>
              {me.roundBet > 0 && <span style={{ marginLeft: 12 }}>Apuesta actual: <span style={{ color: '#a78bfa' }}>{me.roundBet.toLocaleString('es-AR')}</span></span>}
            </div>
          )}
        </div>
      )}

      {/* Waiting for players */}
      {isWaiting && players.length < 2 && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#6a6a8a', fontFamily: 'Rajdhani', fontSize: '0.9rem' }}>
          Esperando más jugadores... ({players.length}/2 mínimo)
        </div>
      )}

      {/* Action bar */}
      <div className="card" style={{ border: '1px solid #1e1e30', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>

          {canStart && (
            <button className="btn btn-primary" onClick={doStart} style={{ fontFamily: 'Rajdhani', fontWeight: 700, padding: '10px 28px' }}>
              🃏 Iniciar Partida
            </button>
          )}

          {isMyTurn && !actionLoading && (
            <>
              <button onClick={() => doAction('fold')} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444', borderRadius: 6, padding: '10px 22px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'}>
                FOLD
              </button>

              {callAmt === 0
                ? <button className="btn btn-secondary" onClick={() => doAction('check')} style={{ padding: '10px 22px', fontFamily: 'Rajdhani', fontWeight: 700 }}>CHECK</button>
                : <button className="btn btn-secondary" onClick={() => doAction('call')} style={{ padding: '10px 22px', fontFamily: 'Rajdhani', fontWeight: 700 }}>CALL {callAmt.toLocaleString('es-AR')}</button>
              }

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="input" type="number" placeholder="Monto..."
                  min={(state.currentBet || 0) + (state.minRaise || state.buyIn || 100)}
                  value={raiseAmt} onChange={e => setRaiseAmt(e.target.value)}
                  style={{ width: 100, fontFamily: 'Rajdhani', fontWeight: 700 }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => doAction('raise', raiseAmt)} disabled={!raiseAmt || parseInt(raiseAmt) <= state.currentBet}
                  style={{ padding: '8px 16px', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                  RAISE
                </button>
              </div>

              <button onClick={() => doAction('allin')} style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.45)', color: '#ffd700', borderRadius: 6, padding: '10px 18px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,215,0,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,215,0,0.12)'}>
                ALL IN ♠
              </button>
            </>
          )}

          {actionLoading && <div style={{ color: '#6a6a8a', fontFamily: 'Rajdhani' }}>...</div>}

          {!isMyTurn && !isWaiting && !isShowdown && (
            <div style={{ color: '#6a6a8a', fontFamily: 'Rajdhani', fontSize: '0.88rem' }}>
              Turno de: <span style={{ color: '#ffd700', fontWeight: 700 }}>{currentPlayer?.username}</span>...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
