import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ─── Constants ────────────────────────────────────────────────────────────────
const TRUCO_LABEL = {
  2: 'TRUCO', 3: 'RETRUCO', 4: 'VALE CUATRO',
};
const ENVIDO_LABEL = {
  envido: 'ENVIDO', real_envido: 'REAL ENVIDO', falta_envido: 'FALTA ENVIDO',
};

// Card images from the open-source Spanish deck by Basquetteur (CC BY-SA 3.0)
// via jsDelivr CDN mirroring mcmd/playingcards.io-spanish.playing.cards
const CDN = 'https://cdn.jsdelivr.net/gh/mcmd/playingcards.io-spanish.playing.cards@master/img';
const cardUrl   = (num, palo) => `${CDN}/${String(num).padStart(2, '0')}-${palo.toLowerCase()}.png`;
const reversoUrl = `${CDN}/reverso.png`;

// ─── Card component ───────────────────────────────────────────────────────────
function SpanishCard({ num, palo, hidden, size = 'md', selected, selectable, onClick }) {
  const [w, h] = { sm: [44, 66], md: [60, 90], lg: [76, 114] }[size] || [60, 90];
  const animClass = hidden ? 'card-deal' : 'card-deal card-revealed';

  return (
    <div
      onClick={selectable ? onClick : undefined}
      className={animClass}
      style={{
        width: w, height: h, flexShrink: 0,
        borderRadius: 5,
        cursor: selectable ? 'pointer' : 'default',
        userSelect: 'none',
        transform: selected ? 'translateY(-12px) scale(1.07)' : 'none',
        transition: 'transform 0.15s, filter 0.15s',
        filter: selected
          ? 'drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
          : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.7))',
        outline: selected ? '2px solid #ffd700' : 'none',
        outlineOffset: 2,
        overflow: 'hidden',
      }}
    >
      <img
        src={hidden ? reversoUrl : cardUrl(num, palo)}
        alt={hidden ? 'carta' : `${num} de ${palo}`}
        style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', borderRadius: 5 }}
        loading="lazy"
      />
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ scores, trickWins, players, myUserId }) {
  const myTeam  = players.find(p => p.userId === myUserId)?.team ?? 0;
  const oppTeam = myTeam === 0 ? 1 : 0;
  const myScore  = scores[myTeam]  || 0;
  const oppScore = scores[oppTeam] || 0;

  const teamLabel = (t) => {
    const members = players.filter(p => p.team === t).map(p => p.username);
    return members.join(' & ') || `Equipo ${t + 1}`;
  };

  const ScoreRow = ({ score, label, isMe, tricks }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <div style={{ width: 80, fontSize: '0.7rem', color: isMe ? '#ffd700' : '#a5a6b8', fontFamily: 'Inter, system-ui', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isMe ? '👤 Vos' : '🔴 ' + label}
      </div>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(score / 15) * 100}%`, height: '100%', background: isMe ? '#ffd700' : '#6f7088', borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <div style={{ width: 32, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isMe ? '#ffd700' : '#a5a6b8', fontSize: '0.78rem' }}>{score}/15</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: tricks > i ? (isMe ? '#ffd700' : '#6f7088') : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <ScoreRow score={myScore}  label={teamLabel(myTeam)}  isMe       tricks={trickWins[myTeam]} />
      <ScoreRow score={oppScore} label={teamLabel(oppTeam)} isMe={false} tricks={trickWins[oppTeam]} />
    </div>
  );
}

// ─── Offer banner ─────────────────────────────────────────────────────────────
function OfferBanner({ offer, type, onAccept, onReject, myUserId }) {
  if (!offer) return null;
  const isMe = offer.byUserId === myUserId;
  const label = type === 'truco'
    ? TRUCO_LABEL[offer.offeredPts] || 'TRUCO'
    : ENVIDO_LABEL[offer.type] || offer.type?.toUpperCase();

  const isHighStakes = (type === 'truco' && offer.offeredPts >= 3) || (type === 'envido' && offer.type === 'falta_envido');
  const animClass = `bounce-in ${isHighStakes ? 'shake' : ''}`;

  return (
    <div className={animClass} style={{
      background: type === 'truco' ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)',
      border: `1px solid ${type === 'truco' ? '#fbbf24' : '#60a5fa'}60`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
    }}>
      <div>
        <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1rem', color: type === 'truco' ? '#fbbf24' : '#60a5fa' }}>
          📣 {offer.byUsername} canta {label}
        </div>
        {type === 'truco' && (
          <div style={{ fontSize: '0.75rem', color: '#a5a6b8', marginTop: 2 }}>
            La mano valdría {offer.offeredPts} {offer.offeredPts === 1 ? 'punto' : 'puntos'}
          </div>
        )}
      </div>
      {!isMe ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAccept} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.85rem' }}>
            ✓ QUIERO
          </button>
          <button onClick={onReject} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.85rem' }}>
            ✗ NO QUIERO
          </button>
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: '#6f7088', fontFamily: 'Inter, system-ui' }}>Esperando respuesta...</div>
      )}
    </div>
  );
}

// ─── Player area ──────────────────────────────────────────────────────────────
function PlayerArea({ player, isCurrent, isMe, small }) {
  if (!player) return null;
  const played = player.playedCards || [];
  const hidden = player.remainingCards || 0;

  return (
    <div style={{
      background: isCurrent && !isMe ? 'rgba(251,191,36,0.06)' : 'transparent',
      border: isCurrent && !isMe ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
      borderRadius: 10, padding: '6px 10px',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 90 }}>
        <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.78rem', color: isCurrent ? '#fbbf24' : '#a5a6b8' }}>
          {isCurrent ? '⏳ ' : ''}{player.username}
          {player.team === 0 ? ' 🔵' : ' 🔴'}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {Array.from({ length: hidden }).map((_, i) => (
            <SpanishCard key={i} hidden size="sm" />
          ))}
        </div>
      </div>
      {played.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.62rem', color: '#4a4b60', fontFamily: 'Inter, system-ui' }}>Jugó:</span>
          {played.map((c, i) => <SpanishCard key={i} num={c.num} palo={c.palo} size="sm" />)}
        </div>
      )}
    </div>
  );
}

// ─── Trick area ───────────────────────────────────────────────────────────────
function TrickArea({ trick, lastTrick }) {
  const display = trick?.length ? trick : null;

  return (
    <div style={{ textAlign: 'center', minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {display ? (
        <>
          <div style={{ fontSize: '0.62rem', color: '#4a4b60', fontFamily: 'Inter, system-ui', letterSpacing: '0.1em' }}>BAZA EN JUEGO</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end' }}>
            {display.map((t, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <SpanishCard num={t.card.num} palo={t.card.palo} size="md" />
                <div style={{ fontFamily: 'Inter, system-ui', fontSize: '0.62rem', color: '#6f7088', marginTop: 3 }}>{t.username}</div>
              </div>
            ))}
          </div>
        </>
      ) : lastTrick ? (
        <div style={{ opacity: 0.4, display: 'flex', gap: 8, justifyContent: 'center' }}>
          {lastTrick.trick?.map((t, i) => (
            <SpanishCard key={i} num={t.card.num} palo={t.card.palo} size="sm" />
          ))}
        </div>
      ) : (
        <div style={{ color: '#2a2a3a', fontFamily: 'Inter, system-ui', fontSize: '0.85rem' }}>Mesa vacía</div>
      )}
    </div>
  );
}

// ─── Hand end banner ──────────────────────────────────────────────────────────
function HandEndBanner({ result, players, myUserId, countdown }) {
  if (!result) return null;
  const myTeam = players.find(p => p.userId === myUserId)?.team ?? 0;
  const won = result.winnerTeam === myTeam;

  return (
    <div className="bounce-in" style={{
      background: won ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${won ? '#22c55e' : '#ef4444'}50`,
      borderRadius: 10, padding: '12px 16px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1.2rem', color: won ? '#22c55e' : '#ef4444' }}>
        {result.mazo ? `🏳️ ${result.byUsername} se fue al mazo` : won ? '🏆 Ganaste la mano!' : '💔 Perdiste la mano'}
      </div>
      <div style={{ color: '#a5a6b8', fontFamily: 'Inter, system-ui', marginTop: 4, fontSize: '0.82rem' }}>
        +{result.trucoPoints} {result.trucoPoints === 1 ? 'punto' : 'puntos'} para {won ? 'tu equipo' : 'el equipo rival'}
      </div>
      {countdown > 0 && (
        <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#4a4b60', fontFamily: 'Inter, system-ui' }}>
          Próxima mano en {countdown}s...
        </div>
      )}
    </div>
  );
}

// ─── Game Over banner ─────────────────────────────────────────────────────────
function GameOverBanner({ gameOver, players, myUserId, onRematch, onLeave }) {
  if (!gameOver) return null;
  const myTeam = players.find(p => p.userId === myUserId)?.team ?? 0;
  const won = gameOver.winnerTeam === myTeam;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#0a0a18,#0f0f22)',
        border: `2px solid ${won ? '#ffd700' : '#6f7088'}`,
        borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 400,
        boxShadow: `0 0 60px ${won ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.5)'}`,
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 12 }}>{won ? '🏆' : '💀'}</div>
        <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '2rem', color: won ? '#ffd700' : '#a5a6b8', letterSpacing: '0.08em', marginBottom: 8 }}>
          {won ? '¡GANASTE!' : '¡PERDISTE!'}
        </div>
        <div style={{ color: '#6f7088', fontFamily: 'Inter, system-ui', fontSize: '1rem', marginBottom: 24 }}>
          {gameOver.scores[0]} — {gameOver.scores[1]}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onRematch} style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1rem' }}>
            🔄 Revancha
          </button>
          <button onClick={onLeave} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#a5a6b8', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1rem' }}>
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Room list ────────────────────────────────────────────────────────────────
function RoomList({ rooms, onCreate, onJoin, err, loading }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '2rem', color: '#ff2d7a', letterSpacing: '0.1em' }}>🀄 TRUCO ARGENTINO</div>
        <div style={{ color: '#6f7088', fontFamily: 'Inter, system-ui', fontSize: '0.85rem', marginTop: 4 }}>Mazo español · 1v1 o 2v2 · Primero a 15</div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 14 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
        <button onClick={() => onCreate('1v1')} disabled={loading} style={{ background: 'rgba(255,45,122,0.08)', border: '1px solid rgba(255,45,122,0.28)', color: '#ff2d7a', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.95rem' }}>
          + Nueva sala 1v1
        </button>
        <button onClick={() => onCreate('2v2')} disabled={loading} style={{ background: 'rgba(255,45,122,0.06)', border: '1px solid rgba(255,45,122,0.18)', color: 'rgba(255,45,122,0.7)', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.95rem' }}>
          + Nueva sala 2v2
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a4b60', fontFamily: 'Inter, system-ui' }}>
          No hay salas disponibles — ¡creá la primera!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rooms.map(r => (
            <div key={r.id} style={{
              background: 'rgba(255,45,122,0.04)', border: '1px solid rgba(255,45,122,0.12)',
              borderRadius: 10, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, color: '#ff2d7a', fontSize: '1rem' }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6f7088', marginTop: 2 }}>
                  {r.mode} · {r.playerCount}/{r.maxPlayers} jugadores · {r.status === 'playing' ? '🟡 En curso' : '🟢 Esperando'}
                </div>
              </div>
              {r.status === 'waiting' && r.playerCount < r.maxPlayers && (
                <button onClick={() => onJoin(r.id)} style={{ background: 'rgba(255,45,122,0.12)', border: '1px solid rgba(255,45,122,0.35)', color: '#ff2d7a', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 700 }}>
                  Unirse
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Waiting room ─────────────────────────────────────────────────────────────
function WaitingRoom({ room, myUserId, onStart, onLeave, err }) {
  const isCreator = room.players[0]?.userId === myUserId;
  const needed = room.maxPlayers - room.players.length;

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <div className="card" style={{ border: '1px solid rgba(255,45,122,0.18)', background: 'linear-gradient(135deg,rgba(255,45,122,0.04),#0a0a14)' }}>
        <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '1.4rem', color: '#ff2d7a', marginBottom: 4 }}>{room.name}</div>
        <div style={{ fontSize: '0.8rem', color: '#6f7088', marginBottom: 24 }}>Modo: {room.mode} · Primero en llegar a 15 puntos</div>

        {err && <div className="alert alert-error" style={{ marginBottom: 14 }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {Array.from({ length: room.maxPlayers }).map((_, i) => {
            const p = room.players[i];
            return (
              <div key={i} style={{
                background: p ? 'rgba(255,45,122,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${p ? 'rgba(255,45,122,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: p ? (i % 2 === 0 ? '#1a4a8a' : '#4a1a2a') : '#1a1a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                  {p ? (i % 2 === 0 ? '🔵' : '🔴') : '⏳'}
                </div>
                <div style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, color: p ? '#e0e0f0' : '#4a4b60' }}>
                  {p ? p.username : 'Esperando...'}
                </div>
                {p?.userId === myUserId && <span style={{ fontSize: '0.7rem', color: '#ffd700', fontFamily: 'Inter, system-ui' }}>(vos)</span>}
                <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6f7088' }}>
                  {i % 2 === 0 ? 'Equipo 🔵' : 'Equipo 🔴'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {isCreator && needed === 0 && (
            <button className="btn btn-primary" onClick={onStart} style={{ fontFamily: 'Inter, system-ui', fontWeight: 700, padding: '12px 32px' }}>
              🀄 Empezar
            </button>
          )}
          {needed > 0 && (
            <div style={{ color: '#6f7088', fontFamily: 'Inter, system-ui', fontSize: '0.85rem', marginTop: 8 }}>
              Faltan {needed} jugador{needed !== 1 ? 'es' : ''}...
            </div>
          )}
          <button onClick={onLeave} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6f7088', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 600 }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: '#4a4b60', fontFamily: 'Inter, system-ui' }}>
          Compartí la sala: <code style={{ color: '#ff2d7a' }}>{room.id}</code>
        </div>
      </div>
    </div>
  );
}

// ─── Main game board ──────────────────────────────────────────────────────────
function GameBoard({ room, myUserId, onPlayCard, onCallTruco, onRespondTruco, onCallEnvido, onRespondEnvido, onMazo, onRematch, onLeave, err, loading, muted, onToggleMute }) {
  const [selCard, setSelCard] = useState(null);
  const myCards    = room.myCards || [];
  const myEnvido   = room.myEnvido;
  const players    = room.players || [];
  const myPlayer   = players.find(p => p.userId === myUserId);
  const myTeam     = myPlayer?.team ?? 0;
  const opponents  = players.filter(p => p.team !== myTeam);
  const teammates  = players.filter(p => p.team === myTeam && p.userId !== myUserId);
  const isMyTurn   = room.currentUserId === myUserId && room.phase === 'playing';
  const lastTrick  = room.trickHistory?.length ? room.trickHistory[room.trickHistory.length - 1] : null;
  const currentOpponent = opponents.find(p => p.userId === room.currentUserId);

  const canCallTruco  = room.phase === 'playing' && !room.trucoOffer && room.trucoPts < 4;
  const canCallEnvido = room.phase === 'playing' && !room.envidoOffer && !room.envidoSettled && (room.tricksCompleted || 0) === 0;
  const canMazo       = room.phase === 'playing' && !room.trucoOffer && !room.envidoOffer;

  const nextTrucoPts = room.trucoPts < 2 ? 2 : room.trucoPts < 3 ? 3 : 4;

  const handleCardClick = (card) => {
    if (!isMyTurn) return;
    if (room.trucoOffer || room.envidoOffer) return;
    if (selCard?.id === card.id) {
      onPlayCard(card.id);
      setSelCard(null);
    } else {
      setSelCard(card);
    }
  };

  const callBtnStyle = (color) => ({
    height: 40, borderRadius: 8, border: `1px solid ${color}50`,
    background: `${color}12`, color,
    fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: '0.78rem',
    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Game over overlay (full screen, outside layout) */}
      {room.gameOver && (
        <GameOverBanner
          gameOver={room.gameOver}
          players={players}
          myUserId={myUserId}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      )}

      <div className="casino-roul-view">

        {/* ── LEFT PANEL ───────────────────────────────── */}
        <div className="casino-roul-panel">
          <div className="casino-roul-panel__title">🀄 Truco</div>

          {/* Score */}
          <ScoreBar
            scores={room.scores || [0, 0]}
            trickWins={room.trickWins || [0, 0]}
            players={players}
            myUserId={myUserId}
          />

          {/* Turn status */}
          {isMyTurn ? (
            <div style={{
              background: 'rgba(111,255,125,0.08)', border: '1px solid rgba(111,255,125,0.25)',
              borderRadius: 8, padding: '7px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.6rem', color: '#4a4b60', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>Tu turno</div>
              {selCard
                ? <div style={{ fontSize: '0.75rem', color: '#ffd700', fontFamily: 'Inter, system-ui' }}>Clickeá de nuevo para jugar</div>
                : <div style={{ fontSize: '0.75rem', color: '#6fff7d', fontFamily: 'Inter, system-ui' }}>Seleccioná una carta</div>
              }
            </div>
          ) : room.phase === 'playing' && currentOpponent ? (
            <div style={{
              background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.18)',
              borderRadius: 8, padding: '7px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.6rem', color: '#4a4b60', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>Turno de</div>
              <div style={{ fontSize: '0.85rem', color: '#ffd700', fontWeight: 700, fontFamily: 'Inter, system-ui' }}>{currentOpponent.username}</div>
            </div>
          ) : null}

          {/* My hand */}
          {room.phase !== 'waiting' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Tu mano
                </div>
                {myEnvido !== null && (
                  <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: 'Inter, system-ui', fontWeight: 700 }}>
                    Envido: {myEnvido}
                  </div>
                )}
              </div>
              {myCards.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {myCards.map(c => (
                    <SpanishCard
                      key={c.id}
                      num={c.num}
                      palo={c.palo}
                      size="lg"
                      selectable={isMyTurn && !room.trucoOffer && !room.envidoOffer}
                      selected={selCard?.id === c.id}
                      onClick={() => handleCardClick(c)}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ color: '#2a2a3a', fontFamily: 'Inter, system-ui', fontSize: '0.82rem', textAlign: 'center', padding: '10px 0' }}>Sin cartas</div>
              )}
            </div>
          )}

          {/* Call buttons */}
          {room.phase === 'playing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {canCallTruco && (
                <button onClick={() => onCallTruco(nextTrucoPts)} disabled={loading} style={callBtnStyle('#fbbf24')}>
                  📣 {TRUCO_LABEL[nextTrucoPts]}
                </button>
              )}
              {canCallEnvido && (
                <>
                  <button onClick={() => onCallEnvido('envido')} disabled={loading} style={callBtnStyle('#60a5fa')}>
                    🎯 ENVIDO
                  </button>
                  <button onClick={() => onCallEnvido('real_envido')} disabled={loading} style={callBtnStyle('#60a5fa')}>
                    🎯 REAL ENVIDO
                  </button>
                  <button onClick={() => onCallEnvido('falta_envido')} disabled={loading} style={callBtnStyle('#60a5fa')}>
                    🎯 FALTA ENVIDO
                  </button>
                </>
              )}
              {canMazo && (
                <button onClick={onMazo} disabled={loading} style={callBtnStyle('#ef4444')}>
                  🏳️ AL MAZO
                </button>
              )}
            </div>
          )}

          {err && <div className="casino-err">{err}</div>}

          {/* Leave + mute */}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button
              onClick={onToggleMute}
              style={{ background: 'none', border: '1px solid var(--c-line2)', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', color: 'var(--c-text4)', fontSize: '1rem' }}
              title={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={onLeave}
              style={{
                flex: 1, background: 'none', border: '1px solid var(--c-line2)', borderRadius: 7,
                padding: '7px 14px', cursor: 'pointer', color: 'var(--c-text3)',
                fontFamily: 'Inter, system-ui', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,45,122,0.4)'; e.currentTarget.style.color = '#ff2d7a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-line2)'; e.currentTarget.style.color = 'var(--c-text3)'; }}
            >
              ← Salir
            </button>
          </div>
        </div>

        {/* ── RIGHT STAGE ─────────────────────────────── */}
        <div className="casino-roul-stage" style={{ flexDirection: 'column', gap: 10, minHeight: 400 }}>

          {/* Hand end result */}
          {room.phase === 'hand_end' && !room.gameOver && room.handEndResult && (
            <HandEndBanner result={room.handEndResult} players={players} myUserId={myUserId} countdown={0} />
          )}

          {/* Envido result */}
          {room.envidoResult && !room.envidoOffer && (
            <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'Inter, system-ui' }}>
              {room.envidoResult.rejected
                ? `Envido rechazado → +1 pt para ${players.find(p => room.teams?.[room.envidoResult.winnerTeam]?.includes(p.userId))?.username}`
                : `Envido: +${room.envidoResult.pts} pts → Equipo ${room.envidoResult.winnerTeam === myTeam ? 'vuestro 🔵' : 'rival 🔴'}`}
            </div>
          )}

          {/* Offer banners */}
          <OfferBanner
            offer={room.trucoOffer}
            type="truco"
            myUserId={myUserId}
            onAccept={() => onRespondTruco(true)}
            onReject={() => onRespondTruco(false)}
          />
          <OfferBanner
            offer={room.envidoOffer}
            type="envido"
            myUserId={myUserId}
            onAccept={() => onRespondEnvido(true)}
            onReject={() => onRespondEnvido(false)}
          />

          {/* Opponents + teammates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {opponents.map(p => (
              <PlayerArea key={p.userId} player={p} isCurrent={room.currentUserId === p.userId} isMe={false} />
            ))}
            {teammates.map(p => (
              <PlayerArea key={p.userId} player={p} isCurrent={room.currentUserId === p.userId} isMe={false} />
            ))}
          </div>

          {/* Table / trick area */}
          <div style={{
            flex: 1,
            background: 'radial-gradient(ellipse at 50% 50%, #1e7b3c 0%, #155d2d 50%, #0f4d26 100%)',
            borderRadius: 14, border: '5px solid #2e1a06',
            boxShadow: '0 0 0 2px #3d2408, 0 8px 32px rgba(0,0,0,0.8)',
            padding: '16px 20px', minHeight: 140, display: 'flex',
            alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)', pointerEvents: 'none' }} />
            <TrickArea trick={room.trick} lastTrick={lastTrick} />
          </div>

          {/* Waiting message */}
          {room.phase === 'waiting' && (
            <div style={{ textAlign: 'center', color: 'var(--c-text4)', fontFamily: 'Inter, system-ui', fontSize: '0.85rem' }}>
              Esperando para iniciar...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Truco({ user }) {
  const [view, setView]     = useState('list');
  const [rooms, setRooms]   = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom]     = useState(null);
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [muted, setMuted]     = useState(casinoAudio.muted);

  const pollRef      = useRef(null);
  const roomsRef     = useRef(null);
  const nextHandRef  = useRef(null);

  const prevMyTurnRef         = useRef(false);
  const prevPlayedCardsRef    = useRef(0);
  const prevPhaseRef          = useRef('');
  const prevTrucoOfferRef     = useRef(null);
  const prevEnvidoOfferRef    = useRef(null);
  const prevGameOverRef       = useRef(false);

  const myUserId = user?.id;

  const pollRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const r = await api.trucoGetRoom(roomId);
      setRoom(r);

      if (r.phase === 'hand_end' && !r.gameOver) {
        if (nextHandRef.current) return;
        nextHandRef.current = setTimeout(async () => {
          try {
            const next = await api.trucoNextHand(roomId);
            setRoom(next);
          } catch {}
          nextHandRef.current = null;
        }, 4000);
      } else if (r.phase === 'playing' && nextHandRef.current) {
        clearTimeout(nextHandRef.current);
        nextHandRef.current = null;
      }
    } catch (e) { setErr(e.message); }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) { clearInterval(pollRef.current); return; }
    pollRoom();
    pollRef.current = setInterval(pollRoom, 2000);
    return () => { clearInterval(pollRef.current); clearTimeout(nextHandRef.current); };
  }, [roomId, pollRoom]);

  useEffect(() => {
    if (!room) return;
    const myPlayer = room.players?.find(p => p.userId === user?.id);
    const myTeam = myPlayer?.team ?? 0;

    const isMyTurn = room.currentUserId === user?.id && room.phase === 'playing' && !room.trucoOffer && !room.envidoOffer;
    if (isMyTurn && !prevMyTurnRef.current) casinoAudio.playTurnAlert();
    prevMyTurnRef.current = isMyTurn;

    const totalPlayed = room.players?.reduce((sum, p) => sum + (p.playedCards?.length || 0), 0) || 0;
    if (totalPlayed > prevPlayedCardsRef.current) casinoAudio.playCardSlide();
    prevPlayedCardsRef.current = totalPlayed;

    if (room.trucoOffer && !prevTrucoOfferRef.current) casinoAudio.playTurnAlert();
    prevTrucoOfferRef.current = room.trucoOffer;

    if (room.envidoOffer && !prevEnvidoOfferRef.current) casinoAudio.playTurnAlert();
    prevEnvidoOfferRef.current = room.envidoOffer;

    if (room.phase === 'hand_end' && prevPhaseRef.current !== 'hand_end') {
      const won = room.handEndResult?.winnerTeam === myTeam;
      won ? casinoAudio.playWin() : casinoAudio.playLose();
    }
    prevPhaseRef.current = room.phase;

    if (room.gameOver && !prevGameOverRef.current) {
      const won = room.gameOver.winnerTeam === myTeam;
      won ? casinoAudio.playWin() : casinoAudio.playLose();
      prevGameOverRef.current = true;
    }
    if (!room.gameOver) prevGameOverRef.current = false;
  }, [room, user?.id]);

  useEffect(() => {
    if (view !== 'list') { clearInterval(roomsRef.current); return; }
    const load = () => api.trucoGetRooms().then(setRooms).catch(() => {});
    load();
    roomsRef.current = setInterval(load, 4000);
    return () => clearInterval(roomsRef.current);
  }, [view]);

  const createRoom = async (mode) => {
    setLoading(true); setErr('');
    try {
      const r = await api.trucoCreateRoom({ mode, name: `Sala de ${user?.username || 'jugador'}` });
      setRoomId(r.id); setRoom(r); setView('room');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const joinRoom = async (id) => {
    setLoading(true); setErr('');
    try {
      const r = await api.trucoJoinRoom(id);
      setRoomId(r.id || id); setRoom(r); setView('room');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const leaveRoom = async () => {
    try { if (roomId) await api.trucoLeaveRoom(roomId); } catch {}
    clearInterval(pollRef.current);
    clearTimeout(nextHandRef.current);
    setRoomId(null); setRoom(null); setView('list'); setErr('');
  };

  const startGame = async () => {
    setLoading(true); setErr('');
    try { const r = await api.trucoStart(roomId); setRoom(r); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const act = async (fn, ...args) => {
    setLoading(true); setErr('');
    try { const r = await fn(...args); setRoom(r); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (!user) return (
    <div className="empty" style={{ paddingTop: 60 }}>
      <div className="empty-icon">🀄</div>
      <p>Iniciá sesión para jugar</p>
    </div>
  );

  if (view === 'list') {
    return <RoomList rooms={rooms} onCreate={createRoom} onJoin={joinRoom} err={err} loading={loading} />;
  }

  if (!room) return <div style={{ textAlign: 'center', padding: 40, color: '#6f7088', fontFamily: 'Inter, system-ui' }}>Cargando sala...</div>;

  if (room.status === 'waiting' || (room.status === 'playing' && !room.myCards?.length && room.phase === 'waiting')) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={leaveRoom} style={{ background: 'transparent', border: '1px solid var(--c-line2)', color: 'var(--c-text3)', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: 'Inter, system-ui', fontWeight: 600, fontSize: '0.85rem' }}>
            ← Volver al lobby
          </button>
          <button onClick={() => { const m = casinoAudio.toggleMute(); setMuted(m); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'rgba(255,255,255,0.3)', padding: 4 }} title={muted ? 'Activar Sonido' : 'Silenciar'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
        <WaitingRoom room={room} myUserId={myUserId} onStart={startGame} onLeave={leaveRoom} err={err} />
      </div>
    );
  }

  return (
    <GameBoard
      room={room}
      myUserId={myUserId}
      err={err}
      loading={loading}
      muted={muted}
      onToggleMute={() => { const m = casinoAudio.toggleMute(); setMuted(m); }}
      onPlayCard={cardId   => act(() => api.trucoPlayCard(roomId, { cardId }))}
      onCallTruco={pts     => act(() => api.trucoCallTruco(roomId, { offeredPts: pts }))}
      onRespondTruco={acc  => act(() => api.trucoRespondTruco(roomId, { accept: acc }))}
      onCallEnvido={type   => act(() => api.trucoCallEnvido(roomId, { type }))}
      onRespondEnvido={acc => act(() => api.trucoRespondEnvido(roomId, { accept: acc }))}
      onMazo={() => {
        if (window.confirm('¿Seguro que te vas al mazo?')) act(() => api.trucoMazo(roomId));
      }}
      onRematch={() => act(() => api.trucoRematch(roomId))}
      onLeave={leaveRoom}
    />
  );
}
