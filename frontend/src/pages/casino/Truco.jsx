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
const cardUrl  = (num, palo) => `${CDN}/${String(num).padStart(2, '0')}-${palo.toLowerCase()}.png`;
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
  const myTeam = players.find(p => p.userId === myUserId)?.team ?? 0;
  const oppTeam = myTeam === 0 ? 1 : 0;
  const myScore  = scores[myTeam]  || 0;
  const oppScore = scores[oppTeam] || 0;

  const teamLabel = (t) => {
    const members = players.filter(p => p.team === t).map(p => p.username);
    return members.join(' & ') || `Equipo ${t + 1}`;
  };

  const ScoreRow = ({ score, label, isMe, tricks }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ width: 90, fontSize: '0.72rem', color: isMe ? '#ffd700' : '#9090b0', fontFamily: 'Inter', system-ui, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isMe ? '👤 Vos' : '🔴 ' + label}
      </div>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(score / 15) * 100}%`, height: '100%', background: isMe ? '#ffd700' : '#6a6a8a', borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <div style={{ width: 40, textAlign: 'right', fontFamily: 'Inter', system-ui, fontWeight: 700, color: isMe ? '#ffd700' : '#9090b0', fontSize: '0.85rem' }}>{score}/15</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: tricks > i ? (isMe ? '#ffd700' : '#6a6a8a') : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
      <ScoreRow score={myScore}  label={teamLabel(myTeam)}  isMe tricks={trickWins[myTeam]}  />
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
      borderRadius: 10, padding: '14px 16px', marginBottom: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
    }}>
      <div>
        <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '1.1rem', color: type === 'truco' ? '#fbbf24' : '#60a5fa' }}>
          📣 {offer.byUsername} canta {label}
        </div>
        {type === 'truco' && (
          <div style={{ fontSize: '0.78rem', color: '#a5a6b8', marginTop: 2 }}>
            La mano valdría {offer.offeredPts} {offer.offeredPts === 1 ? 'punto' : 'puntos'}
          </div>
        )}
      </div>
      {!isMe ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAccept} style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.9rem' }}>
            ✓ QUIERO
          </button>
          <button onClick={onReject} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.9rem' }}>
            ✗ NO QUIERO
          </button>
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: '#6f7088', fontFamily: 'Inter', system-ui }}>Esperando respuesta...</div>
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
      borderRadius: 10, padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 100 }}>
        <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.8rem', color: isCurrent ? '#fbbf24' : '#9090b0' }}>
          {isCurrent ? '⏳ ' : ''}{player.username}
          {player.team === 0 ? ' 🔵' : ' 🔴'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {Array.from({ length: hidden }).map((_, i) => (
            <SpanishCard key={i} hidden size="sm" />
          ))}
        </div>
      </div>
      {played.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: '#4a4a6a', fontFamily: 'Inter', system-ui }}>Jugó:</span>
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
          <div style={{ fontSize: '0.65rem', color: '#4a4a6a', fontFamily: 'Inter', system-ui, letterSpacing: '0.1em' }}>BAZA EN JUEGO</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end' }}>
            {display.map((t, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <SpanishCard num={t.card.num} palo={t.card.palo} size="md" />
                <div style={{ fontFamily: 'Inter', system-ui, fontSize: '0.65rem', color: '#6f7088', marginTop: 3 }}>{t.username}</div>
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
        <div style={{ color: '#2a2a3a', fontFamily: 'Inter', system-ui, fontSize: '0.9rem' }}>Mesa vacía</div>
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
      borderRadius: 12, padding: '16px 20px', marginBottom: 12, textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '1.4rem', color: won ? '#22c55e' : '#ef4444' }}>
        {result.mazo ? `🏳️ ${result.byUsername} se fue al mazo` : won ? '🏆 Ganaste la mano!' : '💔 Perdiste la mano'}
      </div>
      <div style={{ color: '#a5a6b8', fontFamily: 'Inter', system-ui, marginTop: 4, fontSize: '0.85rem' }}>
        +{result.trucoPoints} {result.trucoPoints === 1 ? 'punto' : 'puntos'} para {won ? 'tu equipo' : 'el equipo rival'}
      </div>
      {countdown > 0 && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#4a4a6a', fontFamily: 'Inter', system-ui }}>
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
        border: `2px solid ${won ? '#ffd700' : '#6a6a8a'}`,
        borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 400,
        boxShadow: `0 0 60px ${won ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.5)'}`,
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 12 }}>{won ? '🏆' : '💀'}</div>
        <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '2rem', color: won ? '#ffd700' : '#9090b0', letterSpacing: '0.08em', marginBottom: 8 }}>
          {won ? '¡GANASTE!' : '¡PERDISTE!'}
        </div>
        <div style={{ color: '#6f7088', fontFamily: 'Inter', system-ui, fontSize: '1rem', marginBottom: 24 }}>
          {gameOver.scores[0]} — {gameOver.scores[1]}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onRematch} style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '1rem' }}>
            🔄 Revancha
          </button>
          <button onClick={onLeave} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#a5a6b8', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '1rem' }}>
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
        <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '2rem', color: '#ff2d7a', letterSpacing: '0.1em' }}>🀄 TRUCO ARGENTINO</div>
        <div style={{ color: '#6f7088', fontFamily: 'Inter', system-ui, fontSize: '0.85rem', marginTop: 4 }}>Mazo español · 1v1 o 2v2 · Primero a 15</div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 14 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
        <button onClick={() => onCreate('1v1')} disabled={loading} style={{ background: 'rgba(255,45,122,0.08)', border: '1px solid rgba(255,45,122,0.28)', color: '#ff2d7a', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.95rem' }}>
          + Nueva sala 1v1
        </button>
        <button onClick={() => onCreate('2v2')} disabled={loading} style={{ background: 'rgba(255,45,122,0.06)', border: '1px solid rgba(255,45,122,0.18)', color: '#00e8c070', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.95rem' }}>
          + Nueva sala 2v2
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a4a6a', fontFamily: 'Inter', system-ui }}>
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
                <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, color: '#ff2d7a', fontSize: '1rem' }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6f7088', marginTop: 2 }}>
                  {r.mode} · {r.playerCount}/{r.maxPlayers} jugadores · {r.status === 'playing' ? '🟡 En curso' : '🟢 Esperando'}
                </div>
              </div>
              {r.status === 'waiting' && r.playerCount < r.maxPlayers && (
                <button onClick={() => onJoin(r.id)} style={{ background: 'rgba(255,45,122,0.12)', border: '1px solid rgba(255,45,122,0.35)', color: '#ff2d7a', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700 }}>
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
        <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '1.4rem', color: '#ff2d7a', marginBottom: 4 }}>{room.name}</div>
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
                <div style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, color: p ? '#e0e0f0' : '#4a4a6a' }}>
                  {p ? p.username : 'Esperando...'}
                </div>
                {p?.userId === myUserId && <span style={{ fontSize: '0.7rem', color: '#ffd700', fontFamily: 'Inter', system-ui }}>(vos)</span>}
                <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6f7088' }}>
                  {i % 2 === 0 ? 'Equipo 🔵' : 'Equipo 🔴'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {isCreator && needed === 0 && (
            <button className="btn btn-primary" onClick={onStart} style={{ fontFamily: 'Inter', system-ui, fontWeight: 700, padding: '12px 32px' }}>
              🀄 Empezar
            </button>
          )}
          {needed > 0 && (
            <div style={{ color: '#6f7088', fontFamily: 'Inter', system-ui, fontSize: '0.85rem', marginTop: 8 }}>
              Faltan {needed} jugador{needed !== 1 ? 'es' : ''}...
            </div>
          )}
          <button onClick={onLeave} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#6f7088', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 600 }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: '#4a4a6a', fontFamily: 'Inter', system-ui }}>
          Compartí la sala: <code style={{ color: '#ff2d7a' }}>{room.id}</code>
        </div>
      </div>
    </div>
  );
}

// ─── Main game board ──────────────────────────────────────────────────────────
function GameBoard({ room, myUserId, onPlayCard, onCallTruco, onRespondTruco, onCallEnvido, onRespondEnvido, onMazo, onRematch, onLeave, err, loading }) {
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

  const canCallTruco  = room.phase === 'playing' && !room.trucoOffer && room.trucoPts < 4;
  const canCallEnvido = room.phase === 'playing' && !room.envidoOffer && !room.envidoSettled && (room.tricksCompleted || 0) === 0;
  const canMazo       = room.phase === 'playing' && !room.trucoOffer && !room.envidoOffer;

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

  const nextTrucoPts = room.trucoPts < 2 ? 2 : room.trucoPts < 3 ? 3 : 4;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
      {/* Game over overlay */}
      {room.gameOver && (
        <GameOverBanner
          gameOver={room.gameOver}
          players={players}
          myUserId={myUserId}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      )}

      <div className="card" style={{ border: '1px solid rgba(255,45,122,0.12)', background: 'linear-gradient(135deg,#060610,#0a0a18)', padding: '16px' }}>
        {/* Score */}
        <ScoreBar scores={room.scores || [0, 0]} trickWins={room.trickWins || [0, 0]} players={players} myUserId={myUserId} />

        {err && <div className="alert alert-error" style={{ marginBottom: 10, fontSize: '0.82rem' }}>{err}</div>}

        {/* Hand end result */}
        {room.phase === 'hand_end' && !room.gameOver && room.handEndResult && (
          <HandEndBanner result={room.handEndResult} players={players} myUserId={myUserId} countdown={0} />
        )}

        {/* Envido result (after settled) */}
        {room.envidoResult && !room.envidoOffer && (
          <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'Inter', system-ui }}>
            {room.envidoResult.rejected
              ? `Envido rechazado → +1 pt para ${players.find(p => room.teams[room.envidoResult.winnerTeam]?.includes(p.userId))?.username}`
              : `Envido: +${room.envidoResult.pts} pts → Equipo ${room.envidoResult.winnerTeam === myTeam ? 'vuestro 🔵' : 'rival 🔴'}`}
          </div>
        )}

        {/* Truco offer */}
        <OfferBanner
          offer={room.trucoOffer}
          type="truco"
          myUserId={myUserId}
          onAccept={() => onRespondTruco(true)}
          onReject={() => onRespondTruco(false)}
        />

        {/* Envido offer */}
        <OfferBanner
          offer={room.envidoOffer}
          type="envido"
          myUserId={myUserId}
          onAccept={() => onRespondEnvido(true)}
          onReject={() => onRespondEnvido(false)}
        />

        {/* Opponents */}
        <div style={{ marginBottom: 10 }}>
          {opponents.map(p => (
            <PlayerArea key={p.userId} player={p} isCurrent={room.currentUserId === p.userId} isMe={false} />
          ))}
          {teammates.map(p => (
            <PlayerArea key={p.userId} player={p} isCurrent={room.currentUserId === p.userId} isMe={false} />
          ))}
        </div>

        {/* Current trick */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '12px', marginBottom: 10, minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <TrickArea trick={room.trick} lastTrick={lastTrick} />
        </div>

        {/* My hand */}
        {room.phase !== 'waiting' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.7rem', color: '#6f7088', fontFamily: 'Inter', system-ui, letterSpacing: '0.1em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>TU MANO {isMyTurn ? '— Tu turno' : ''}</span>
              {myEnvido !== null && <span style={{ color: '#60a5fa' }}>Envido: {myEnvido} pts</span>}
            </div>
            {isMyTurn && !room.trucoOffer && !room.envidoOffer && selCard && (
              <div style={{ textAlign: 'center', marginBottom: 8, fontSize: '0.78rem', color: '#fbbf24', fontFamily: 'Inter', system-ui }}>
                Volvé a clickear la carta para jugarla
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {myCards.length > 0 ? myCards.map(c => (
                <SpanishCard
                  key={c.id}
                  num={c.num}
                  palo={c.palo}
                  size="lg"
                  selectable={isMyTurn && !room.trucoOffer && !room.envidoOffer}
                  selected={selCard?.id === c.id}
                  onClick={() => handleCardClick(c)}
                />
              )) : (
                <div style={{ color: '#2a2a3a', fontFamily: 'Inter', system-ui, fontSize: '0.85rem', padding: '20px 0' }}>Sin cartas</div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {room.phase === 'playing' && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div style={{ fontSize: '0.68rem', color: '#4a4a6a', fontFamily: 'Inter', system-ui, letterSpacing: '0.1em', marginBottom: 8 }}>ENVITES</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Truco calls */}
              {canCallTruco && (
                <button onClick={() => onCallTruco(nextTrucoPts)} disabled={loading} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.82rem' }}>
                  📣 {TRUCO_LABEL[nextTrucoPts]}
                </button>
              )}

              {/* Envido calls */}
              {canCallEnvido && (
                <>
                  <button onClick={() => onCallEnvido('envido')} disabled={loading} style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.82rem' }}>
                    🎯 ENVIDO
                  </button>
                  <button onClick={() => onCallEnvido('real_envido')} disabled={loading} style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.82rem' }}>
                    🎯 REAL ENVIDO
                  </button>
                  <button onClick={() => onCallEnvido('falta_envido')} disabled={loading} style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.82rem' }}>
                    🎯 FALTA ENVIDO
                  </button>
                </>
              )}

              {/* Mazo */}
              {canMazo && (
                <button onClick={onMazo} disabled={loading} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 700, fontSize: '0.82rem', marginLeft: 'auto' }}>
                  🏳️ AL MAZO
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Truco({ user }) {
  const [view, setView]     = useState('list');   // 'list' | 'room'
  const [rooms, setRooms]   = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom]     = useState(null);
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [muted, setMuted]     = useState(casinoAudio.muted);

  const pollRef      = useRef(null);
  const roomsRef     = useRef(null);
  const nextHandRef  = useRef(null);
  const countdown    = useRef(null);

  const prevMyTurnRef = useRef(false);
  const prevPlayedCardsRef = useRef(0);
  const prevPhaseRef = useRef('');
  const prevTrucoOfferRef = useRef(null);
  const prevEnvidoOfferRef = useRef(null);
  const prevGameOverRef = useRef(false);

  const myUserId = user?.id;

  // Poll active room
  const pollRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const r = await api.trucoGetRoom(roomId);
      setRoom(r);

      if (r.phase === 'hand_end' && !r.gameOver) {
        if (nextHandRef.current) return; // already scheduled
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

  // Sound triggers on room state updates
  useEffect(() => {
    if (!room) return;
    const myPlayer = room.players?.find(p => p.userId === user?.id);
    const myTeam = myPlayer?.team ?? 0;
    
    // 1. My turn alert
    const isMyTurn = room.currentUserId === user?.id && room.phase === 'playing' && !room.trucoOffer && !room.envidoOffer;
    if (isMyTurn && !prevMyTurnRef.current) {
      casinoAudio.playTurnAlert();
    }
    prevMyTurnRef.current = isMyTurn;

    // 2. Play slide sound when cards are played
    const totalPlayed = room.players?.reduce((sum, p) => sum + (p.playedCards?.length || 0), 0) || 0;
    if (totalPlayed > prevPlayedCardsRef.current) {
      casinoAudio.playCardSlide();
    }
    prevPlayedCardsRef.current = totalPlayed;

    // 3. Play chip/ding sound when offers are made
    if (room.trucoOffer && !prevTrucoOfferRef.current) {
      casinoAudio.playTurnAlert();
    }
    prevTrucoOfferRef.current = room.trucoOffer;

    if (room.envidoOffer && !prevEnvidoOfferRef.current) {
      casinoAudio.playTurnAlert();
    }
    prevEnvidoOfferRef.current = room.envidoOffer;

    // 4. Play win/lose on hand end
    if (room.phase === 'hand_end' && prevPhaseRef.current !== 'hand_end') {
      const won = room.handEndResult?.winnerTeam === myTeam;
      if (won) {
        casinoAudio.playWin();
      } else {
        casinoAudio.playLose();
      }
    }
    prevPhaseRef.current = room.phase;

    // 5. Play win/lose on game over
    if (room.gameOver && !prevGameOverRef.current) {
      const won = room.gameOver.winnerTeam === myTeam;
      if (won) {
        casinoAudio.playWin();
      } else {
        casinoAudio.playLose();
      }
      prevGameOverRef.current = true;
    }
    if (!room.gameOver) {
      prevGameOverRef.current = false;
    }
  }, [room, user?.id]);

  // Poll rooms list
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
      setRoomId(r.id);
      setRoom(r);
      setView('room');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const joinRoom = async (id) => {
    setLoading(true); setErr('');
    try {
      const r = await api.trucoJoinRoom(id);
      setRoomId(r.id || id);
      setRoom(r);
      setView('room');
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
    try {
      const r = await api.trucoStart(roomId);
      setRoom(r);
    } catch (e) { setErr(e.message); }
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

  // Top bar with audio toggle
  const TopBar = () => view === 'room' ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <button onClick={leaveRoom} style={{ background: 'transparent', border: '1px solid #1e1e30', color: '#a5a6b8', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: 'Inter', system-ui, fontWeight: 600, fontSize: '0.85rem' }}>
        ← Volver al lobby
      </button>
      <button onClick={() => {
        const nowMuted = casinoAudio.toggleMute();
        setMuted(nowMuted);
      }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'rgba(255,255,255,0.3)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={muted ? 'Activar Sonido' : 'Silenciar'}>
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  ) : null;

  if (view === 'list') {
    return (
      <div>
        <RoomList rooms={rooms} onCreate={createRoom} onJoin={joinRoom} err={err} loading={loading} />
      </div>
    );
  }

  if (!room) return <div style={{ textAlign: 'center', padding: 40, color: '#6f7088', fontFamily: 'Inter', system-ui }}>Cargando sala...</div>;

  if (room.status === 'waiting' || (room.status === 'playing' && !room.myCards?.length && room.phase === 'waiting')) {
    return (
      <div>
        <TopBar />
        <WaitingRoom room={room} myUserId={myUserId} onStart={startGame} onLeave={leaveRoom} err={err} />
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <GameBoard
        room={room}
        myUserId={myUserId}
        err={err}
        loading={loading}
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
    </div>
  );
}
