import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';
import AlbionAvatar from '../../components/AlbionAvatar';

// ─── Playing Card ─────────────────────────────────────────────────────────────
const SUIT_RED = new Set(['♥','♦']);

function Card({ card, faceDown = false, size = 'md', style = {} }) {
  const S = {
    sm: { w: 44, h: 62, fs: '0.72rem', ss: '0.9rem', r: 5 },
    md: { w: 60, h: 86, fs: '0.9rem',  ss: '1.3rem', r: 7 },
    lg: { w: 76, h: 108, fs: '1rem',   ss: '1.6rem', r: 8 },
  }[size] || { w: 60, h: 86, fs: '0.9rem', ss: '1.3rem', r: 7 };

  const base = { width: S.w, height: S.h, borderRadius: S.r, flexShrink: 0, ...style };
  const animClass = faceDown ? 'card-deal' : 'card-deal card-revealed';

  if (faceDown || !card) {
    return (
      <div className={animClass} style={{
        ...base,
        background: 'linear-gradient(135deg, #ff2d7a 0%, #99003d 100%)',
        border: '2.5px solid #ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Inner geometric pattern */}
        <div style={{
          position: 'absolute', inset: 3,
          border: '1px dashed rgba(255,255,255,0.3)',
          borderRadius: S.r - 2,
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.12) 4px, rgba(255,255,255,0.12) 8px)'
        }} />
      </div>
    );
  }

  const color = SUIT_RED.has(card.suit) ? '#ff2d7a' : '#1a1b24';
  return (
    <div className={animClass} style={{
      ...base,
      background: 'linear-gradient(145deg, #ffffff 0%, #f7f8fa 100%)',
      border: '1px solid #dcdfe6',
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '4px 6px',
      position: 'relative'
    }}>
      <div style={{ color, lineHeight: 1 }}>
        <div style={{ fontWeight: 850, fontSize: S.fs, fontFamily: 'Georgia, serif' }}>{card.value}</div>
        <div style={{ fontSize: `calc(${S.fs} * 0.85)` }}>{card.suit}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: S.ss, color, lineHeight: 1, fontWeight: 700 }}>{card.suit}</div>
      <div style={{ color, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontWeight: 850, fontSize: S.fs, fontFamily: 'Georgia, serif' }}>{card.value}</div>
        <div style={{ fontSize: `calc(${S.fs} * 0.85)` }}>{card.suit}</div>
      </div>
    </div>
  );
}

// ─── Player Seat ──────────────────────────────────────────────────────────────
function PlayerSeat({ player, isMe, isCurrent, myCards, phase, showdown }) {
  const folded = player.status === 'folded';
  const allIn  = player.status === 'allIn';

  // Determine cards to show for this player seat
  let cards = [];
  if (isMe) {
    cards = myCards || [];
  } else if (phase === 'showdown' && showdown?.players) {
    const sdPlayer = showdown.players.find(p => p.userId === player.userId);
    if (sdPlayer && sdPlayer.holeCards) {
      cards = sdPlayer.holeCards;
    }
  }

  const initial = player.username ? player.username[0].toUpperCase() : '?';

  // Determine action subtitle label
  let actionText = '';
  let actionColor = 'var(--c-text3)';
  if (folded) {
    actionText = 'FOLD';
    actionColor = '#8a8b9c';
  } else if (allIn) {
    actionText = 'ALL IN';
    actionColor = '#ffd700';
  } else if (isCurrent) {
    actionText = 'TURNO';
    actionColor = '#ff2d7a';
  } else if (player.roundBet > 0) {
    actionText = `APUESTA: ${player.roundBet.toLocaleString('es-AR')}`;
    actionColor = '#ff2d7a';
  }

  return (
    <div style={{ width: 124, textAlign: 'center', opacity: folded ? 0.45 : 1, transition: 'all 0.3s', position: 'relative' }}>
      
      {/* 2 Hole Cards standing above the box */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', height: 62, marginBottom: 8, visibility: (folded || (phase === 'waiting')) ? 'hidden' : 'visible' }}>
        <Card card={cards[0] ? cards[0] : null} faceDown={cards.length < 1} size="sm" />
        <Card card={cards[1] ? cards[1] : null} faceDown={cards.length < 2} size="sm" />
      </div>

      {/* Avatar or Initial Badge Circle (overlapping the top border) */}
      {player.albion_avatar ? (
        <div style={{
          position: 'absolute', top: 39, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3,
          boxShadow: isCurrent ? '0 0 12px rgba(255,45,122,0.6)' : 'none',
          borderRadius: '50%'
        }}>
          <AlbionAvatar 
            avatarId={player.albion_avatar} 
            ringId={player.albion_ring} 
            size={42} 
            characterName={player.username} 
          />
        </div>
      ) : (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: isCurrent ? 'linear-gradient(135deg, #ff2d7a, #99003d)' : 'var(--c-surface3)',
          border: `1.5px solid ${isCurrent ? '#ff2d7a' : 'rgba(255,255,255,0.15)'}`,
          display: 'grid', placeItems: 'center',
          fontSize: 10, fontWeight: 800, color: '#fff',
          position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
          boxShadow: isCurrent ? '0 0 8px rgba(255,45,122,0.5)' : 'none',
          zIndex: 3,
        }}>
          {initial}
        </div>
      )}

      {/* Main Seat Info Box */}
      <div className={isCurrent ? 'poker-seat-box active' : 'poker-seat-box'} style={{
        background: 'rgba(18, 18, 26, 0.85)',
        border: isCurrent ? '2px solid #ff2d7a' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isCurrent ? '0 0 15px rgba(255,45,122,0.45), inset 0 0 8px rgba(255,45,122,0.15)' : '0 4px 12px rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: '16px 8px 10px 8px',
        transition: 'all 0.3s',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{ fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {player.username || '?'}{isMe ? ' (tú)' : ''}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#6fff7d', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: 2 }}>
          ⚡ {(player.chips || 0).toLocaleString('es-AR')}
        </div>
        
        {actionText && (
          <div style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            color: actionColor,
            fontFamily: "'Unbounded', system-ui",
            marginTop: 6,
            letterSpacing: '0.04em',
            textShadow: actionColor !== '#8a8b9c' ? `0 0 6px ${actionColor}80` : 'none'
          }}>
            {actionText}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Oval Table layout ────────────────────────────────────────────────────────
const SEAT_POS = {
  1: [[50, 88]],
  2: [[50, 88], [50, 12]],
  3: [[50, 88], [15, 36], [85, 36]],
  4: [[50, 88], [10, 50], [50, 12], [90, 50]],
  5: [[50, 88], [8, 68], [16, 26], [84, 26], [92, 68]],
  6: [[50, 88], [6, 68], [12, 28], [50, 12], [88, 28], [94, 68]],
};

function EmptySeat({ pos }) {
  return (
    <div style={{
      width: 74, height: 74, borderRadius: '50%',
      background: 'rgba(255,255,255,0.02)',
      border: '2px dashed rgba(255,255,255,0.12)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3,
    }}>
      <div style={{ fontSize: 16, opacity: 0.2 }}>♟</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter,system-ui', letterSpacing: '0.06em' }}>LIBRE</div>
    </div>
  );
}

function PokerTable({ players, myUserId, myCards, community, pot, phase, currentIdx, showdown, maxPlayers = 6 }) {
  const myIdx = players.findIndex(p => p.userId === myUserId);
  const ordered = myIdx >= 0
    ? [...players.slice(myIdx), ...players.slice(0, myIdx)]
    : players;
  const totalSeats = Math.max(ordered.length, maxPlayers, 2);
  const n = Math.min(totalSeats, 6);
  const positions = SEAT_POS[n] || SEAT_POS[6];
  const currentPlayer = players[currentIdx];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', height: 520 }}>

      {/* Oval Felt & Wood Rim Board */}
      <div style={{
        position: 'absolute', left: '12%', right: '12%', top: '15%', bottom: '15%',
        background: 'radial-gradient(ellipse at 50% 50%, #1a3c26 0%, #112719 60%, #0a1b11 100%)',
        borderRadius: '150px',
        border: '14px solid #2a150c', // Thick wood border
        boxShadow: 'inset 0 0 25px rgba(0,0,0,0.85), 0 12px 40px rgba(0,0,0,0.9), 0 0 0 2px #d4af37', // Gold ring!
        overflow: 'hidden', zIndex: 1,
      }}>
        {/* Subtle grid pattern line details */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 6px)', pointerEvents: 'none' }} />

        {/* Felt Watermark logo */}
        <div style={{
          position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Unbounded', system-ui, sans-serif",
          fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.24em',
          color: 'rgba(255,255,255,0.09)', textTransform: 'uppercase',
          whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none'
        }}>
          ANT1GRAVITY POKER
        </div>

        {/* Center Community Cards */}
        <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: 5 }, (_, i) => {
            const card = community?.[i];
            return (
              <div key={i}>
                {card ? (
                  <Card card={card} size="md" />
                ) : (
                  <div style={{
                    width: 60, height: 86,
                    border: '1.5px dashed rgba(255,255,255,0.15)',
                    borderRadius: 7,
                    background: 'rgba(0,0,0,0.18)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Center Pot Capsule */}
        <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          {pot > 0 && (
            <div style={{
              background: 'rgba(7, 7, 10, 0.85)',
              border: '1.5px solid #ffd700',
              borderRadius: 20,
              padding: '5px 16px',
              fontFamily: "'Unbounded', system-ui",
              fontWeight: 700,
              fontSize: '0.8rem',
              color: '#ffd700',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 8px rgba(255,215,0,0.2)'
            }}>
              <span style={{ fontSize: '0.9rem' }}>🪙</span>
              <span>{pot.toLocaleString('es-AR')}</span>
              <span style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.75 }}>TK</span>
            </div>
          )}
        </div>

        {/* Showdown Small Indicator inside felt */}
        {showdown?.winner && (
          <div style={{ position: 'absolute', top: '65%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
            <div style={{
              fontFamily: "'Unbounded', system-ui",
              fontWeight: 800, fontSize: '0.72rem', color: '#ffd700',
              background: 'rgba(7, 7, 12, 0.95)',
              padding: '6px 14px', borderRadius: 8,
              border: '1.5px solid #ff2d7a',
              boxShadow: '0 4px 20px rgba(255,45,122,0.35)',
              whiteSpace: 'nowrap',
            }}>
              🏆 {showdown.winner.username} gana!
            </div>
          </div>
        )}
      </div>

      {/* All seats (active players + empty slots) */}
      {Array.from({ length: n }, (_, i) => {
        const player = ordered[i] || null;
        const [px, py] = positions[i] || [50, 50];
        if (!player) return (
          <div key={`empty-${i}`} style={{ position:'absolute', left:`${px}%`, top:`${py}%`, transform:'translate(-50%,-50%)', zIndex:2 }}>
            <EmptySeat />
          </div>
        );
        const isMe = player.userId === myUserId;
        const isCurrent = player.userId === currentPlayer?.userId;
        return (
          <div key={player.userId} style={{ position: 'absolute', left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
            <PlayerSeat
              player={player}
              isMe={isMe}
              isCurrent={isCurrent}
              myCards={isMe ? myCards : []}
              phase={phase}
              showdown={showdown}
            />
          </div>
        );
      })}

      {ordered.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, system-ui', fontSize: '1.1rem', zIndex: 2 }}>
          Esperando jugadores...
        </div>
      )}
    </div>
  );
}

// ─── Room List (Lobby) ────────────────────────────────────────────────────────
function RoomList({ onJoin }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState(100);
  const [maxP, setMaxP] = useState(6);
  const [bigBlind, setBigBlind] = useState(0); // 0 = auto (buyIn / 100)
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
      const room = await api.pokerCreateRoom({ name: name.trim(), buyIn, maxPlayers: maxP, bigBlind: bigBlind || undefined });
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
      
      {/* Upgraded Lobby Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--c-line2)', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--c-text4)', letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
            JUEGOS / TEXAS HOLD'EM
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            <span style={{ color: '#fff' }}>Texas </span>
            <span style={{ color: '#ff2d7a' }}>Hold'em</span>
          </h1>
          <div style={{ fontSize: '0.78rem', color: '#6f7088', marginTop: 6, fontFamily: 'Inter, system-ui' }}>
            Multijugador • Tiempo real • No Limit
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(s => !s)} style={{
          height: 38,
          background: 'linear-gradient(135deg, #ff2d7a, #d91b5c)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontFamily: "'Unbounded', system-ui",
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '0 16px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255,45,122,0.25)',
          transition: 'all 0.15s'
        }}>
          {showCreate ? '✕ Cancelar' : '+ Nueva Mesa'}
        </button>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {showCreate && (
        <div className="card" style={{ border: '1px solid rgba(255,45,122,0.2)', background: 'rgba(255,45,122,0.04)', marginBottom: 16, padding: '16px 20px', borderRadius: 12 }}>
          <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1.05rem', color: '#ff2d7a', marginBottom: 14 }}>Nueva Mesa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" placeholder="Nombre de la sala..." value={name} onChange={e => setName(e.target.value)} style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', color: '#fff' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#6f7088', display: 'block', marginBottom: 4 }}>Buy-in (chips)</label>
                <select className="input" value={buyIn} onChange={e => setBuyIn(Number(e.target.value))} style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', color: '#fff' }}>
                  {[100, 500, 1000, 5000, 10000, 25000, 50000, 100000].map(v => (
                    <option key={v} value={v}>{v >= 1000 ? `${(v/1000).toLocaleString('es-AR')}k` : v}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#6f7088', display: 'block', marginBottom: 4 }}>Big blind</label>
                <select className="input" value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', color: '#fff' }}>
                  <option value={0}>Auto (100 BB stack)</option>
                  {(() => {
                    // BB options spanning ~10x range from "deep" (200 BB) to "shallow" (20 BB)
                    const opts = new Set();
                    [200, 100, 50, 20].forEach(n => {
                      const v = Math.max(2, Math.floor(buyIn * 10 / n));
                      opts.add(v);
                    });
                    return [...opts].sort((a,b) => a-b).map(v => (
                      <option key={v} value={v}>
                        {v >= 1000 ? `${(v/1000).toLocaleString('es-AR')}k` : v}
                        {' '}({Math.floor(buyIn * 10 / v)} BB)
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#6f7088', display: 'block', marginBottom: 4 }}>Máx. jugadores</label>
                <select className="input" value={maxP} onChange={e => setMaxP(Number(e.target.value))} style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', color: '#fff' }}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={create} disabled={creating} style={{ height: 40, background: '#ff2d7a', border: 'none', fontWeight: 700 }}>{creating ? 'Creando...' : 'Crear y Unirme'}</button>
          </div>
        </div>
      )}

      {loading && <div className="loading"><div className="spinner" /> Cargando salas...</div>}
      {!loading && rooms.length === 0 && !showCreate && (
        <div className="empty" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line2)', padding: '40px 20px', borderRadius: 14 }}>
          <div className="empty-icon" style={{ fontSize: '2.5rem', color: '#ff2d7a', marginBottom: 12 }}>♠</div>
          <p style={{ color: 'var(--c-text3)' }}>No hay mesas activas.<br />¡Creá una nueva!</p>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rooms.map(r => {
          const s = r.state || {};
          const playerCount = s.players?.length || 0;
          const isFull = playerCount >= (s.maxPlayers || 6);
          const isPlaying = s.status === 'playing';
          return (
            <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid rgba(255,45,122,0.08)', background: 'var(--c-surface)', padding: '16px 20px', borderRadius: 12 }}>
              <div>
                <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.98rem', color: 'white' }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6f7088', marginTop: 4, fontFamily: 'Inter, system-ui' }}>
                  Buy-in: {(s.buyIn || 100).toLocaleString('es-AR')} chips · {playerCount}/{s.maxPlayers || 6} jugadores
                  <span style={{ marginLeft: 8, color: isPlaying ? '#ffd700' : '#00cc66' }}>● {isPlaying ? 'En juego' : 'Esperando'}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => join(r.id)} disabled={isFull} style={{
                flexShrink: 0,
                background: isFull ? 'var(--c-surface2)' : isPlaying ? 'rgba(255,215,0,0.12)' : 'rgba(255,45,122,0.15)',
                border: isFull ? '1px solid var(--c-line2)' : isPlaying ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,45,122,0.3)',
                color: isFull ? 'var(--c-text4)' : isPlaying ? '#ffd700' : '#ff2d7a',
                fontFamily: "'Unbounded', system-ui",
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 8,
                cursor: isFull ? 'not-allowed' : 'pointer'
              }}>
                {isFull ? 'Llena' : isPlaying ? 'Próx. mano →' : 'Unirse →'}
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
  const [view, setView]       = useState('lobby');
  const [roomId, setRoomId]   = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [raiseAmt, setRaiseAmt] = useState('');
  const [err, setErr]         = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [muted, setMuted]     = useState(casinoAudio.muted);
  const [betTab, setBetTab]   = useState('manual');
  
  // Real-time Hand History Log List State
  const [historyList, setHistoryList] = useState([
    { id: '#PK-4892', desc: 'Color de picas', time: 'hace 1 min', bet: 4480, net: 2240 },
    { id: '#PK-4891', desc: 'Fold pre-flop', time: 'hace 3 min', bet: 200, net: 0 },
    { id: '#PK-4890', desc: 'Par de Jacks', time: 'hace 5 min', bet: 1600, net: -800 },
    { id: '#PK-4889', desc: 'Dos pares', time: 'hace 9 min', bet: 640, net: 320 },
  ]);

  const [turnSecsLeft, setTurnSecsLeft] = useState(null);

  const nextHandTimer  = useRef(null);
  const turnTimerRef   = useRef(null);
  const prevMyTurnRef  = useRef(false);
  const prevCommCountRef = useRef(0);
  const prevPotRef     = useRef(0);
  const prevPhaseRef   = useRef('');

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

  // Audio Alerts and effects
  useEffect(() => {
    if (!gameState) return;
    const state = gameState;
    const players = state.players || [];
    const currentPlayer = players[state.currentIdx];
    const isMyTurn = currentPlayer?.userId === user.id && state.phase !== 'waiting' && state.phase !== 'showdown';

    if (isMyTurn && !prevMyTurnRef.current) casinoAudio.playTurnAlert();
    prevMyTurnRef.current = isMyTurn;

    const commCount = state.community?.filter(Boolean).length || 0;
    if (commCount > prevCommCountRef.current) casinoAudio.playCardSlide();
    prevCommCountRef.current = commCount;

    if (state.pot > prevPotRef.current) casinoAudio.playChip();
    prevPotRef.current = state.pot;

    if (state.phase === 'showdown' && prevPhaseRef.current !== 'showdown') {
      const winner = state.showdown?.winner;
      if (winner) {
        winner.userId === user.id ? casinoAudio.playWin() : casinoAudio.playLose();
      }
    }
    prevPhaseRef.current = state.phase;
  }, [gameState, user.id]);

  // 15-second turn timer — starts when it becomes my turn, auto-folds on expiry
  useEffect(() => {
    const state = gameState;
    if (!state) return;
    const currentPlayer = (state.players||[])[state.currentIdx];
    const isMyTurn = currentPlayer?.userId === user.id
      && state.phase !== 'waiting' && state.phase !== 'showdown';

    if (isMyTurn) {
      if (prevMyTurnRef.current) return; // already running
      setTurnSecsLeft(15);
      clearInterval(turnTimerRef.current);
      let secs = 15;
      turnTimerRef.current = setInterval(() => {
        secs--;
        setTurnSecsLeft(secs);
        if (secs <= 0) {
          clearInterval(turnTimerRef.current);
          turnTimerRef.current = null;
          setTurnSecsLeft(null);
          doAction('fold');
        }
      }, 1000);
    } else {
      clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
      setTurnSecsLeft(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentIdx, gameState?.phase]);

  // Cleanup timer on unmount
  useEffect(() => () => { clearInterval(turnTimerRef.current); }, []);

  // Next Hand Transition loop
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

  // Real-time update of session history log list
  const prevHandoffPhaseRef = useRef('');
  useEffect(() => {
    if (!gameState) return;
    const state = gameState;
    if (state.phase === 'showdown' && prevHandoffPhaseRef.current !== 'showdown') {
      const winner = state.showdown?.winner;
      if (winner) {
        const players = state.players || [];
        const me = players.find(p => p.userId === user.id);
        const isWinnerMe = winner.username === user.username;
        const myBet = me?.roundBet || state.buyIn || 100;
        const netValue = isWinnerMe ? (state.pot - myBet) : -myBet;
        
        const newEntry = {
          id: `#PK-${Math.floor(1000 + Math.random() * 9000)}`,
          desc: winner.handName || 'Mano terminada',
          time: 'hace unos instantes',
          bet: myBet,
          net: netValue
        };
        setHistoryList(prev => [newEntry, ...prev.slice(0, 4)]);
      }
    }
    prevHandoffPhaseRef.current = state.phase;
  }, [gameState?.phase, gameState?.showdown, gameState?.players, gameState?.pot, gameState?.buyIn, user.id, user.username]);

  const handleJoin = (id, state, cards) => {
    setRoomId(id); setGameState(state); setMyCards(cards || []); setErr(''); setView('game');
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

  const doReload = async () => {
    setErr('');
    try {
      const res = await api.pokerReload(roomId);
      setGameState(res.state);
      if (res.myCards?.length) setMyCards(res.myCards);
    } catch (e) { setErr(e.message); }
  };

  if (view === 'lobby') return <RoomList onJoin={handleJoin} />;

  const state = gameState || {};
  const players = state.players || [];
  const pendingPlayers = state.pendingPlayers || [];
  const me = players.find(p => p.userId === user.id);
  const mePending = !me && pendingPlayers.find(p => p.userId === user.id);
  const currentPlayer = players[state.currentIdx];
  const isMyTurn = currentPlayer?.userId === user.id && state.phase !== 'waiting' && state.phase !== 'showdown';
  const callAmt = Math.max(0, (state.currentBet || 0) - (me?.roundBet || 0));
  const isWaiting = state.status === 'waiting' || state.phase === 'waiting';
  const canStart = isWaiting && players.length >= 2 && me;
  const isShowdown = state.phase === 'showdown';
  const minRaise = (state.currentBet || 0) + (state.minRaise || state.bigBlind || Math.max(2, Math.floor((state.buyIn || 100) / 100)));
  const maxRaise = Math.min((me?.chips || 0) + (me?.roundBet || 0), (state.currentBet || 0) + 10000);
  const canReload = me && me.chips === 0 && state.phase !== 'playing';

  return (
    <div className="casino-roul-view">
      <style>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 8px rgba(255,45,122,0.3), inset 0 0 4px rgba(255,45,122,0.1); }
          100% { box-shadow: 0 0 16px rgba(255,45,122,0.65), inset 0 0 10px rgba(255,45,122,0.25); border-color: #ff2d7a; }
        }
        .poker-seat-box.active {
          animation: glow-pulse 1.3s infinite alternate ease-in-out;
        }
      `}</style>

      {/* ── LEFT PANEL: SLICK BETTING SIDEBAR ────────── */}
      <div className="casino-roul-panel">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Manual / Auto segmented toggle tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--c-bg)',
            border: '1px solid var(--c-line2)',
            borderRadius: 8,
            padding: 3,
          }}>
            <button
              onClick={() => setBetTab('manual')}
              style={{
                flex: 1,
                background: betTab === 'manual' ? 'var(--c-surface3)' : 'none',
                border: 'none',
                borderRadius: 6,
                color: betTab === 'manual' ? '#fff' : 'var(--c-text4)',
                padding: '6px 0',
                fontFamily: "'Inter', system-ui",
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Manual
            </button>
            <button
              onClick={() => setBetTab('auto')}
              style={{
                flex: 1,
                background: betTab === 'auto' ? 'var(--c-surface3)' : 'none',
                border: 'none',
                borderRadius: 6,
                color: betTab === 'auto' ? '#fff' : 'var(--c-text4)',
                padding: '6px 0',
                fontFamily: "'Inter', system-ui",
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Auto
            </button>
          </div>

          {/* MONTO DE APUESTA Input Panel */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span>Monto de Apuesta</span>
              <span style={{ color: 'var(--c-text2)', fontWeight: 700 }}>{raiseAmt || minRaise}</span>
            </div>
            <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              <div style={{ paddingLeft: 12, color: '#ffd700', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>🪙</div>
              <input
                type="number"
                min={minRaise}
                max={maxRaise}
                value={raiseAmt}
                onChange={e => setRaiseAmt(Math.min(maxRaise, parseInt(e.target.value) || minRaise))}
                placeholder={minRaise}
                disabled={!isMyTurn || actionLoading}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--c-text)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '10px 8px',
                }}
              />
              <div style={{ display: 'flex', height: 44, borderLeft: '1px solid var(--c-line2)' }}>
                <button
                  disabled={!isMyTurn || actionLoading}
                  onClick={() => setRaiseAmt(prev => {
                    const currentVal = parseInt(prev) || minRaise;
                    return Math.max(minRaise, Math.floor(currentVal / 2));
                  })}
                  style={{
                    background: 'none', border: 'none', width: 34, color: 'var(--c-text3)',
                    fontFamily: 'Inter', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                    borderRight: '1px solid var(--c-line2)'
                  }}
                >½</button>
                <button
                  disabled={!isMyTurn || actionLoading}
                  onClick={() => setRaiseAmt(prev => {
                    const currentVal = parseInt(prev) || minRaise;
                    return Math.min(maxRaise, currentVal * 2);
                  })}
                  style={{
                    background: 'none', border: 'none', width: 34, color: 'var(--c-text3)',
                    fontFamily: 'Inter', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer'
                  }}
                >2×</button>
              </div>
            </div>
          </div>

          {/* Quick Chip Selector Grid */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[10, 50, 100, 500, 1000, 5000, 10000].map(val => (
                <button
                  key={val}
                  disabled={!isMyTurn || actionLoading || val > (me?.chips || 0)}
                  onClick={() => setRaiseAmt(Math.max(minRaise, val))}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    background: parseInt(raiseAmt) === val ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                    border: `1px solid ${parseInt(raiseAmt) === val ? 'rgba(255,45,122,0.4)' : 'var(--c-line2)'}`,
                    color: parseInt(raiseAmt) === val ? 'var(--c-accent)' : 'var(--c-text3)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {val >= 1000 ? `${val/1000}k` : val}
                </button>
              ))}
              <button
                disabled={!isMyTurn || actionLoading}
                onClick={() => setRaiseAmt(me?.chips || minRaise)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  background: parseInt(raiseAmt) === (me?.chips || 0) ? 'rgba(255,215,0,0.12)' : 'var(--c-surface2)',
                  border: `1px solid ${parseInt(raiseAmt) === (me?.chips || 0) ? '#ffd700' : 'var(--c-line2)'}`,
                  color: parseInt(raiseAmt) === (me?.chips || 0) ? '#ffd700' : 'var(--c-text3)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Stats Box (Potential Gain + House Edge) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.52rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Ganancia Potencial</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6fff7d', fontFamily: "'JetBrains Mono', monospace" }}>
                +{((state.pot || 0) + (callAmt || 0) + (parseInt(raiseAmt) || 0)).toLocaleString('es-AR')}
              </div>
            </div>
            <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.52rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Edge de la Casa</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                0.00%
              </div>
            </div>
          </div>

          {/* Start Game Action Button */}
          {canStart && (
            <button onClick={doStart} className="roul-spin-btn" style={{ height: 42, background: 'linear-gradient(135deg, #00cc66, #00994d)', color: '#fff', fontWeight: 800 }}>
              🃏 Iniciar Partida
            </button>
          )}

          {/* Main User Action buttons */}
          {isMyTurn && !actionLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Fold */}
                <button
                  onClick={() => doAction('fold')}
                  style={{
                    flex: 1,
                    height: 38,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontFamily: "'Unbounded', system-ui",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Fold
                </button>

                {/* Call/Check split button */}
                <button
                  onClick={() => doAction(callAmt === 0 ? 'check' : 'call')}
                  style={{
                    flex: 1,
                    height: 38,
                    background: 'rgba(111,255,125,0.08)',
                    border: '1px solid rgba(111,255,125,0.3)',
                    borderRadius: 8,
                    color: '#6fff7d',
                    fontFamily: "'Unbounded', system-ui",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {callAmt === 0 ? 'Check' : `Call - ${callAmt}`}
                </button>
              </div>

              {/* Large Pink Raise Action */}
              <button
                disabled={!raiseAmt || parseInt(raiseAmt) < minRaise}
                onClick={() => doAction('raise', raiseAmt)}
                style={{
                  width: '100%',
                  height: 46,
                  background: 'linear-gradient(135deg, #ff2d7a 0%, #d91b5c 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontFamily: "'Unbounded', system-ui",
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  cursor: (!raiseAmt || parseInt(raiseAmt) < minRaise) ? 'not-allowed' : 'pointer',
                  boxShadow: (!raiseAmt || parseInt(raiseAmt) < minRaise) ? 'none' : '0 4px 15px rgba(255,45,122,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                Raise - {parseInt(raiseAmt) || minRaise}
              </button>

              {/* Raise adjust step -/+ 100 */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setRaiseAmt(prev => {
                    const val = parseInt(prev) || minRaise;
                    return Math.max(minRaise, val - 100);
                  })}
                  style={{
                    flex: 1, height: 34, background: 'var(--c-surface2)',
                    border: '1px solid var(--c-line2)', borderRadius: 8,
                    color: 'var(--c-text2)', fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >- 100</button>
                <button
                  onClick={() => setRaiseAmt(prev => {
                    const val = parseInt(prev) || minRaise;
                    return Math.min(maxRaise, val + 100);
                  })}
                  style={{
                    flex: 1, height: 34, background: 'var(--c-surface2)',
                    border: '1px solid var(--c-line2)', borderRadius: 8,
                    color: 'var(--c-text2)', fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >+ 100</button>
              </div>

              {/* All in */}
              <button
                onClick={() => doAction('allin')}
                style={{
                  width: '100%',
                  height: 34,
                  background: 'rgba(255,215,0,0.06)',
                  border: '1px solid rgba(255,215,0,0.25)',
                  borderRadius: 8,
                  color: '#ffd700',
                  fontFamily: "'Unbounded', system-ui",
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                All-In - {(me?.chips || 0).toLocaleString('es-AR')}
              </button>

            </div>
          )}

          {actionLoading && (
            <div style={{ textAlign: 'center', color: 'var(--c-text4)', fontFamily: 'Inter, system-ui', fontSize: '0.82rem', padding: '10px 0' }}>
              Procesando acción...
            </div>
          )}

          {/* Turn timer — only shown when it's my turn */}
          {isMyTurn && turnSecsLeft !== null && (
            <div style={{
              borderRadius: 8, padding: '8px 12px', textAlign: 'center',
              background: turnSecsLeft <= 5 ? 'rgba(255,45,122,0.10)' : 'rgba(255,215,0,0.05)',
              border: `1px solid ${turnSecsLeft <= 5 ? 'rgba(255,45,122,0.4)' : 'rgba(255,215,0,0.18)'}`,
              transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Tu turno — tiempo restante</div>
              <div style={{
                fontSize: '1.5rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                color: turnSecsLeft <= 5 ? '#ff2d7a' : '#ffd700',
                transition: 'color 0.3s',
              }}>
                {turnSecsLeft}s
              </div>
              <div style={{ height: 3, background: 'var(--c-line2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${(turnSecsLeft / 15) * 100}%`,
                  background: turnSecsLeft <= 5 ? '#ff2d7a' : '#ffd700',
                  transition: 'width 1s linear, background 0.3s',
                }} />
              </div>
            </div>
          )}

          {!isMyTurn && !isWaiting && !isShowdown && currentPlayer && (
            <div style={{
              background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.18)',
              borderRadius: 8, padding: '8px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>Turno de</div>
              <div style={{ fontSize: '0.85rem', color: '#ffd700', fontWeight: 700, fontFamily: 'Inter, system-ui' }}>
                {currentPlayer.username}
              </div>
            </div>
          )}

          {/* Reload chips */}
          {canReload && (
            <button onClick={doReload} style={{
              width: '100%', padding: '11px', borderRadius: 8,
              background: 'rgba(111,255,125,0.08)', border: '1px solid rgba(111,255,125,0.35)',
              color: '#6fff7d', fontFamily: "'Unbounded', system-ui", fontWeight: 700,
              fontSize: '0.68rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              🔄 RECARGAR FICHAS ({((state.buyIn||100)*10).toLocaleString('es-AR')})
            </button>
          )}

          {/* Pending (waiting for next hand) */}
          {mePending && (
            <div style={{
              borderRadius: 8, padding: '10px 12px', textAlign: 'center',
              background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)',
            }}>
              <div style={{ fontSize: 9, fontFamily: "'Unbounded',system-ui", color: '#ffd700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                ⏳ Esperando próxima mano
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                Fichas: {mePending.chips?.toLocaleString('es-AR')}
              </div>
            </div>
          )}

          {/* Other pending players */}
          {pendingPlayers.filter(p => p.userId !== user.id).length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--c-text4)', fontFamily: 'Inter,system-ui' }}>
              Esperando mano: {pendingPlayers.filter(p=>p.userId!==user.id).map(p=>p.username).join(', ')}
            </div>
          )}

          {err && <div className="casino-err">{err}</div>}

          {/* Seed footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--c-text4)', borderTop: '1px dashed var(--c-line2)', paddingTop: 10, marginTop: 4 }}>
            <span>Provably Fair</span>
            <span>seed: {roomId ? roomId.slice(0, 8) : 'a3f9b2d0'}</span>
          </div>

        </div>

        {/* Footer leave button */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 20 }}>
          <button
            onClick={handleLeave}
            style={{
              flex: 1, background: 'none', border: '1px solid var(--c-line2)', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', color: 'var(--c-text3)',
              fontFamily: 'Inter, system-ui', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,45,122,0.4)'; e.currentTarget.style.color = '#ff2d7a'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-line2)'; e.currentTarget.style.color = 'var(--c-text3)'; }}
          >
            ← Salir
          </button>
        </div>
      </div>

      {/* ── RIGHT COLUMN: POKER STAGE ────────────────── */}
      <div className="casino-roul-stage" style={{ flexDirection: 'column', minHeight: 580 }}>
        
        {/* Stage Header Info bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--c-line2)',
          borderRadius: 10,
          padding: '10px 18px',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>
              Mesa #{roomId ? roomId.slice(0, 6).toUpperCase() : 'PK-218'} • NL Hold'em
            </span>
            <span style={{
              background: 'rgba(111,255,125,0.12)',
              border: '1px solid rgba(111,255,125,0.25)',
              color: 'var(--c-accent2)',
              padding: '2px 8px', borderRadius: 4,
              fontSize: 9, fontWeight: 800,
              fontFamily: "'Inter',sans-serif",
              letterSpacing: '0.08em',
            }}>CASINO</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: 'var(--c-text3)', fontFamily: 'Inter' }}>
            {(() => {
              const bb = state.bigBlind || Math.max(2, Math.floor((state.buyIn || 100) / 100));
              const sb = Math.max(1, Math.floor(bb / 2));
              const fmt = n => n >= 1000 ? `${(n/1000).toLocaleString('es-AR')}k` : n;
              return <span>Blinds: <strong style={{ color: '#fff' }}>{fmt(sb)}/{fmt(bb)}</strong></span>;
            })()}
            <span style={{ color: 'var(--c-line2)' }}>•</span>
            <span style={{ textTransform: 'uppercase' }}>Fase: <strong style={{ color: 'var(--c-accent2)' }}>{state.phase || 'Esperando'}</strong></span>
          </div>
        </div>

        {/* Showdown Detail Banner Overlay */}
        {isShowdown && state.showdown?.winner && (
          <div style={{
            textAlign: 'center', padding: '14px 20px',
            background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.25)',
            borderRadius: 12, width: '100%', marginBottom: 16,
            animation: 'winOverlayFadeIn 0.3s forwards',
          }}>
            <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 800, fontSize: '1.25rem', color: '#ffd700', marginBottom: 8 }}>
              🏆 {state.showdown.winner.username} gana · {state.showdown.winner.handName}!
            </div>
            {state.showdown.players?.length > 0 && (
              <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
                {state.showdown.players.map(p => (
                  <div key={p.userId} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#a5a6b8', fontFamily: 'Inter, system-ui', fontWeight: 600 }}>{p.username}</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 5 }}>
                      <Card card={p.holeCards?.[0]} faceDown={!p.holeCards?.[0]} size="sm" />
                      <Card card={p.holeCards?.[1]} faceDown={!p.holeCards?.[1]} size="sm" />
                    </div>
                    {p.bestHand && <div style={{ fontSize: '0.65rem', color: '#ff2d7a', marginTop: 4, fontFamily: 'Inter, system-ui', fontWeight: 700 }}>{p.bestHand.name}</div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'var(--c-text4)', marginTop: 8, fontFamily: 'Inter, system-ui' }}>Próxima mano en 5s...</div>
          </div>
        )}

        {/* Oval table board */}
        <PokerTable
          players={players}
          myUserId={user.id}
          myCards={myCards}
          community={state.community}
          pot={state.pot}
          phase={state.phase}
          currentIdx={state.currentIdx}
          showdown={state.showdown}
          maxPlayers={state.maxPlayers || 6}
        />

        {isWaiting && players.length < 2 && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--c-text4)', fontFamily: 'Inter, system-ui', fontSize: '0.85rem' }}>
            Esperando más jugadores... ({players.length}/2 mínimo)
          </div>
        )}

        {/* Real-time Session History Feed Log Table */}
        <div style={{
          width: '100%',
          background: 'var(--c-surface)',
          border: '1px solid var(--c-line2)',
          borderRadius: 14,
          padding: '16px 20px',
          marginTop: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>
              HISTORIAL RECIENTE
            </span>
            <button
              onClick={() => {
                setHistoryList([
                  { id: `#PK-${Math.floor(1000 + Math.random() * 9000)}`, desc: 'Color de picas', time: 'hace 1 min', bet: 4480, net: 2240 },
                  { id: `#PK-${Math.floor(1000 + Math.random() * 9000)}`, desc: 'Fold pre-flop', time: 'hace 3 min', bet: 200, net: 0 },
                  { id: `#PK-${Math.floor(1000 + Math.random() * 9000)}`, desc: 'Par de Jacks', time: 'hace 5 min', bet: 1600, net: -800 },
                ]);
              }}
              style={{
                background: 'none', border: 'none', color: 'var(--c-text4)',
                fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter',
                cursor: 'pointer', transition: 'color 0.15s'
              }}
              onMouseEnter={e => e.target.style.color = 'var(--c-accent)'}
              onMouseLeave={e => e.target.style.color = 'var(--c-text4)'}
            >
              Ver todo
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-line2)', color: 'var(--c-text4)', fontSize: '0.68rem', fontFamily: "'Unbounded', system-ui" }}>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>PARTIDA</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>MANO</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>TIEMPO</th>
                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>APUESTA</th>
                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>GANANCIA</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((h, idx) => (
                <tr key={idx} style={{ borderBottom: idx < historyList.length - 1 ? '1px solid var(--c-line)' : 'none', color: 'var(--c-text2)' }}>
                  <td style={{ padding: '10px 10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--c-text3)' }}>{h.id}</td>
                  <td style={{ padding: '10px 10px', fontWeight: 600, color: '#fff' }}>{h.desc}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--c-text4)' }}>{h.time}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{h.bet.toLocaleString('es-AR')}</td>
                  <td style={{
                    padding: '10px 10px',
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: h.net > 0 ? '#6fff7d' : h.net < 0 ? '#ef4444' : 'var(--c-text4)'
                  }}>
                    {h.net > 0 ? `+${h.net.toLocaleString('es-AR')}` : h.net < 0 ? `${h.net.toLocaleString('es-AR')}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
