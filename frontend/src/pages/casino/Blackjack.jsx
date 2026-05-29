import React, { useState } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const SUIT_RED = new Set(['♥', '♦']);

function Card({ card, hidden, delay = 0 }) {
  const red = card ? SUIT_RED.has(card.suit) : false;
  const tc  = red ? '#cc1122' : '#0f172a';
  const isRevealed = !hidden && card;

  return (
    <div className={`bj-card ${isRevealed ? 'revealed' : ''}`} style={{
      animationDelay: `${delay}s`,
    }}>
      <div className="bj-card-inner">
        {/* Back Face */}
        <div className="bj-card-face bj-card-back">
          <div className="bj-card-back-pattern" />
        </div>
        
        {/* Front Face */}
        {card && (
          <div className="bj-card-face bj-card-front">
            <div style={{
              color: tc, lineHeight: 1, display: 'flex', flexDirection: 'column',
              height: '100%', justifyContent: 'space-between', padding: '5px 6px',
            }}>
              <div style={{ color: tc, lineHeight: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>{card.value}</div>
                <div style={{ fontSize: '0.7rem' }}>{card.suit}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '1.7rem', color: tc, lineHeight: 1 }}>{card.suit}</div>
              <div style={{ color: tc, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>{card.value}</div>
                <div style={{ fontSize: '0.7rem' }}>{card.suit}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HandArea({ cards, total, label, isPlayer, isInitialDeal, isDone }) {
  return (
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{
        fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        fontFamily: "'Unbounded', system-ui", fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {(cards || []).map((c, i) => {
          let delay = 0;
          if (isInitialDeal) {
            if (isPlayer) {
              delay = i === 0 ? 0.1 : 0.5;
            } else {
              delay = i === 0 ? 0.3 : 0.7;
            }
          } else if (!isPlayer && isDone) {
            if (i === 1) delay = 0.1;
            else if (i >= 2) delay = 0.5 + (i - 2) * 0.4;
          }
          
          return (
            <Card
              key={`card-${i}`}
              card={c}
              hidden={!c}
              delay={delay}
            />
          );
        })}
      </div>
      {total !== undefined && (
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6, padding: '3px 16px',
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.3rem',
          color: total > 21 ? '#ff2d7a' : total === 21 ? '#f5c542' : '#ecedf4',
        }}>
          {total}
        </div>
      )}
    </div>
  );
}

const RESULTS = {
  win:       { label: 'Ganaste',    color: '#6fff7d', prefix: '+' },
  blackjack: { label: 'Blackjack!', color: '#f5c542', prefix: '+' },
  push:      { label: 'Empate',     color: '#a5a6b8', prefix: '' },
  lose:      { label: 'Perdiste',   color: '#ff2d7a', prefix: '' },
  bust:      { label: 'Te pasaste', color: '#ff2d7a', prefix: '' },
};

export default function Blackjack({ balance, onBalanceChange }) {
  const [bet, setBet]         = useState(100);
  const [game, setGame]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [coins, setCoins]     = useState([]);
  const [shuffling, setShuffling] = useState(false);

  const spawnCoins = () => {
    const list = [];
    for (let i = 0; i < 30; i++) {
      list.push({
        id: Math.random(),
        left: `${10 + Math.random() * 80}%`,
        bottom: `${Math.random() * 15}%`,
        delay: `${Math.random() * 0.4}s`,
        symbol: ['🪙', '⚡', '✨', '🪙', '✨'][Math.floor(Math.random() * 5)],
      });
    }
    setCoins(list);
  };

  const playDealerDrawSounds = (oldCardsCount, newCards) => {
    // Flip sound
    setTimeout(() => {
      casinoAudio.playCardSlide();
    }, 150);
    
    // Stagger slide sounds for new cards drawn
    const addedCount = newCards.length - oldCardsCount;
    for (let i = 0; i < addedCount; i++) {
      setTimeout(() => {
        casinoAudio.playCardSlide();
      }, 500 + i * 400);
    }
  };

  const act = async (action, extra = {}) => {
    setLoading(true); setErr('');
    try {
      if (action === 'hit') casinoAudio.playCardSlide();
      else if (action === 'double') { casinoAudio.playChip(); casinoAudio.playCardSlide(); }
      
      const oldDealerCardsCount = game?.dealerCards?.length || 2;
      const res = await api.casinoBlackjack(action, { sessionId: game?.sessionId, ...extra });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      setGame(g => ({ ...g, ...res }));
      
      if (res.status === 'done') {
        const addedCount = res.dealerCards.length - oldDealerCardsCount;
        playDealerDrawSounds(oldDealerCardsCount, res.dealerCards);
        
        // Delay results audio until dealer is done drawing
        const finalDelay = 500 + addedCount * 400 + 350;
        setTimeout(() => {
          if (res.result === 'win' || res.result === 'blackjack') { casinoAudio.playWin(); spawnCoins(); }
          else if (res.result === 'lose' || res.result === 'bust') casinoAudio.playLose();
          else casinoAudio.playChip();
        }, finalDelay);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const start = async () => {
    setLoading(true); setErr(''); setCoins([]);
    try {
      casinoAudio.playChip();
      const res = await api.casinoBlackjack('start', { bet });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      
      // Play staggered card slides!
      casinoAudio.playCardSlide();
      setTimeout(() => casinoAudio.playCardSlide(), 200);
      setTimeout(() => casinoAudio.playCardSlide(), 400);
      setTimeout(() => casinoAudio.playCardSlide(), 600);

      setGame(res);
      
      if (res.status === 'done') {
        // Blackjack on deal!
        setTimeout(() => {
          if (res.result === 'win' || res.result === 'blackjack') { casinoAudio.playWin(); spawnCoins(); }
          else if (res.result === 'lose' || res.result === 'bust') casinoAudio.playLose();
          else casinoAudio.playChip();
        }, 800);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const handleStartClick = () => {
    if (loading || bet < 10 || bet > balance) return;
    setShuffling(true);
    casinoAudio.playCardShuffle();
    setTimeout(() => {
      setShuffling(false);
      start();
    }, 1300);
  };

  const isPlaying = game?.status === 'playing';
  const isDone    = game?.status === 'done';
  const isInitialDeal = isPlaying && game?.playerCards?.length === 2 && game?.dealerCards?.length === 2;
  const result    = isDone ? (RESULTS[game.result] || RESULTS.lose) : null;

  const MAX_BET = 10000;
  const half   = () => setBet(b => Math.max(10, Math.floor(b / 2)));
  const double = () => setBet(b => Math.min(Math.min(balance, MAX_BET), b * 2));
  const max    = () => setBet(Math.min(balance, MAX_BET));

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">Blackjack Pro</div>

        {/* Result summary for Split */}
        {isDone && game?.isSplit && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--c-line2)',
            borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
            marginBottom: 10
          }}>
            <div style={{ fontFamily: "'Unbounded', system-ui", fontWeight: 800, fontSize: '0.65rem', color: 'var(--c-text3)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--c-line2)', paddingBottom: 6 }}>
              Resultados Split
            </div>
            {game.handResults.map((resVal, handIdx) => {
              const outcome = RESULTS[resVal] || RESULTS.lose;
              return (
                <div key={handIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--c-text3)', fontWeight: 600 }}>Mano {handIdx + 1}:</span>
                  <span style={{ fontSize: '0.78rem', color: outcome.color, fontWeight: 700, fontFamily: 'Unbounded, system-ui' }}>{outcome.label}</span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--c-line2)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--c-text)', fontWeight: 700 }}>Ganancia Total:</span>
              <span style={{ fontSize: '0.9rem', color: game.payout > 0 ? '#6fff7d' : '#ff2d7a', fontWeight: 850, fontFamily: 'JetBrains Mono, monospace' }}>
                {game.payout > 0 ? `+${game.payout.toLocaleString('es-AR')}` : '0'} TK
              </span>
            </div>
          </div>
        )}

        {/* Original Result summary */}
        {isDone && game && !game.isSplit && result && (
          <div style={{
            background: `${result.color}10`,
            border: `1px solid ${result.color}35`,
            borderRadius: 10, padding: '12px 14px', textAlign: 'center',
            marginBottom: 10
          }}>
            <div style={{ fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '1.1rem', color: result.color }}>
              {result.label}
            </div>
            {game.payout > 0 && (
              <div style={{ color: '#f5c542', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem', marginTop: 4 }}>
                {result.prefix}{game.payout.toLocaleString('es-AR')} TK
              </div>
            )}
          </div>
        )}

        {/* Bet input */}
        {(!game || isDone) && (
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded',system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
              Apuesta
            </div>
            <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 46 }}>
                <input
                  type="number" min="10" max={MAX_BET} value={bet} disabled={loading}
                  onChange={e => setBet(Math.max(10, Math.min(MAX_BET, parseInt(e.target.value) || 10)))}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'var(--c-text)', fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: '1.1rem', textAlign: 'right',
                  }}
                />
                <span style={{ color: 'var(--c-text4)', fontSize: '0.68rem', marginLeft: 6 }}>TK</span>
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid var(--c-surface2)' }}>
                {[['½', half], ['2×', double], ['MAX', max]].map(([label, action], i, arr) => (
                  <button key={label} onClick={action} disabled={loading} style={{
                    flex: 1, background: 'none', border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid var(--c-surface2)' : 'none',
                    color: 'var(--c-text3)', padding: '7px 0',
                    fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.72rem',
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) e.target.style.color = 'var(--c-accent)'; }}
                  onMouseLeave={e => { e.target.style.color = 'var(--c-text3)'; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {bet > balance && (
              <div style={{ fontSize: '0.72rem', color: 'var(--c-accent)', marginTop: 5, textAlign: 'center' }}>
                Tokens insuficientes
              </div>
            )}
            {bet > MAX_BET && (
              <div style={{ fontSize: '0.72rem', color: 'var(--c-accent)', marginTop: 5, textAlign: 'center' }}>
                Máximo: 10.000 TK por mano
              </div>
            )}
          </div>
        )}

        {err && <div className="casino-err">{err}</div>}

        {/* Action buttons */}
        {isPlaying ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => act('hit')} disabled={loading} style={{
              height: 48, borderRadius: 10, border: '1px solid rgba(111,255,125,0.35)',
              background: loading ? 'var(--c-surface2)' : 'rgba(111,255,125,0.10)',
              color: loading ? 'var(--c-text4)' : '#6fff7d',
              fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.68rem',
              letterSpacing: '0.08em', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>PEDIR CARTA</button>
            
            <button onClick={() => act('stand')} disabled={loading} style={{
              height: 48, borderRadius: 10, border: '1px solid var(--c-line3)',
              background: 'var(--c-surface2)',
              color: 'var(--c-text)', fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.68rem',
              letterSpacing: '0.08em', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>PLANTARSE</button>

            {(() => {
              const activeHandCards = game?.isSplit ? game.hands[game.activeHandIdx] : game?.playerCards;
              const activeHandBet = game?.isSplit ? game.handBets[game.activeHandIdx] : bet;
              const canDouble = activeHandCards?.length === 2 && balance >= activeHandBet;
              const canSplit = !game?.isSplit && game?.playerCards?.length === 2 && game?.playerCards[0].value === game?.playerCards[1].value && balance >= bet;

              return (
                <>
                  {canDouble && (
                    <button onClick={() => act('double')} disabled={loading} style={{
                      height: 48, borderRadius: 10, border: '1px solid rgba(245,197,66,0.35)',
                      background: 'rgba(245,197,66,0.10)',
                      color: '#f5c542', fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.68rem',
                      letterSpacing: '0.06em',
                      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(245,197,66,0.2)'; }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,197,66,0.10)'}
                    >DOBLAR ×2</button>
                  )}
                  {canSplit && (
                    <button onClick={() => act('split')} disabled={loading} style={{
                      height: 48, borderRadius: 10, border: '1px solid rgba(255,45,122,0.35)',
                      background: 'rgba(255,45,122,0.10)',
                      color: '#ff2d7a', fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.68rem',
                      letterSpacing: '0.06em',
                      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,45,122,0.2)'; }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,45,122,0.10)'}
                    >DIVIDIR MANO</button>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <button onClick={handleStartClick} disabled={loading || bet < 10 || bet > balance || bet > MAX_BET} className="roul-spin-btn">
            {loading ? 'CARGANDO...' : isDone ? 'NUEVA PARTIDA' : 'REPARTIR'}
          </button>
        )}

        <div style={{ fontSize: 10, color: 'var(--c-text4)', lineHeight: 1.6, marginTop: 14 }}>
          VS Casa · 21 · Blackjack paga 3:2<br/>
          Doblar / Dividir disponible en primer turno
        </div>
      </div>

      {/* ── RIGHT STAGE ─────────────────────────────── */}
      <div className="casino-roul-stage" style={{ justifyContent: 'center', minHeight: 420 }}>
        <style>{`
          /* Card flip and deal styling */
          .bj-card {
            width: 68px;
            height: 98px;
            perspective: 1000px;
            position: relative;
            flex-shrink: 0;
            animation: dealCard 0.45s cubic-bezier(0.19, 1, 0.22, 1) both;
          }
          .bj-card-inner {
            width: 100%;
            height: 100%;
            position: absolute;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.2);
            border-radius: 9px;
            box-shadow: 3px 5px 14px rgba(0,0,0,0.5);
          }
          .bj-card.revealed .bj-card-inner {
            transform: rotateY(180deg);
          }
          .bj-card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 9px;
            overflow: hidden;
          }
          .bj-card-back {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            border: 2px solid rgba(255, 255, 255, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bj-card-back-pattern {
            position: absolute;
            inset: 5px;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 6px;
            background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px);
          }
          .bj-card-front {
            background: linear-gradient(145deg, #ffffff, #f4f4f4);
            border: 1px solid #d1d5db;
            transform: rotateY(180deg);
          }
          @keyframes dealCard {
            0% {
              transform: translate(250px, -200px) rotate(40deg) scale(0.35);
              opacity: 0;
            }
            100% {
              transform: translate(0, 0) rotate(0deg) scale(1);
              opacity: 1;
            }
          }
          @keyframes textBlink {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
          .blinking-shuffle-text {
            animation: textBlink 1.2s infinite ease-in-out;
          }
        `}</style>

        {/* Green felt table with luxury wood rim and decals */}
        <div style={{
          background: 'radial-gradient(ellipse at 50% 30%, #11582e 0%, #0a3a1d 60%, #052210 100%)',
          borderRadius: 24, 
          border: '14px solid #1f140a',
          boxShadow: 'inset 0 0 0 2px #d4af37, 0 12px 48px rgba(0,0,0,0.9)',
          overflow: 'hidden', position: 'relative', width: '100%', minHeight: 380,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
          padding: '28px 20px',
        }}>
          {/* Scanlines overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)',
          }} />

          {/* Table Decals */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.16,
            zIndex: 1,
          }}>
            <div style={{
              fontFamily: 'Unbounded, system-ui', fontSize: '1.15rem', fontWeight: 800,
              color: '#f5c542', letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 5,
            }}>
              Blackjack Pays 3 to 2
            </div>
            <div style={{
              fontFamily: 'Inter, system-ui', fontSize: '0.62rem', fontWeight: 700,
              color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Dealer must stand on 17 and draw to 16
            </div>
            <div style={{
              fontFamily: 'Inter, system-ui', fontSize: '0.55rem', fontWeight: 600,
              color: '#f5c542', letterSpacing: '0.1em', textTransform: 'uppercase',
              borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 5, width: '50%', textAlign: 'center',
            }}>
              Insurance Pays 2 to 1
            </div>
          </div>

          {/* Deck Shoe */}
          <div style={{
            position: 'absolute', top: 20, right: 20, width: 62, height: 44,
            background: 'linear-gradient(135deg, #1c1917, #0c0a09)',
            border: '2px solid #292524', borderRadius: '4px 8px 4px 4px',
            boxShadow: '2px 4px 10px rgba(0,0,0,0.6)', zIndex: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
              background: '#000', borderRadius: '2px 0 0 2px',
            }} />
            <div style={{
              width: 48, height: 32, background: 'linear-gradient(90deg, #1e40af, #1d4ed8)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2,
              transform: 'skewY(-6deg) translateX(4px)',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.4)',
            }} />
          </div>

          {/* Shuffling animation overlay */}
          {shuffling && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, background: 'rgba(5, 5, 8, 0.55)', backdropFilter: 'blur(2px)',
            }}>
              <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
                <style>{`
                  @keyframes cardShuffleLeft {
                    0%, 100% { transform: translateX(0) rotate(-4deg); z-index: 1; }
                    50% { transform: translateX(-35px) rotate(-12deg); z-index: 2; }
                  }
                  @keyframes cardShuffleRight {
                    0%, 100% { transform: translateX(0) rotate(4deg); z-index: 2; }
                    50% { transform: translateX(35px) rotate(12deg); z-index: 1; }
                  }
                `}</style>
                <div style={{
                  width: 68, height: 98, borderRadius: 9,
                  background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '-4px 6px 12px rgba(0,0,0,0.6)',
                  animation: 'cardShuffleLeft 0.3s infinite ease-in-out',
                }} />
                <div style={{
                  width: 68, height: 98, borderRadius: 9,
                  background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '4px 6px 12px rgba(0,0,0,0.6)',
                  animation: 'cardShuffleRight 0.3s infinite ease-in-out',
                }} />
                <div className="blinking-shuffle-text" style={{
                  position: 'absolute', bottom: -35, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: "'Unbounded', system-ui", fontSize: '0.65rem', fontWeight: 800,
                  color: '#f5c542', letterSpacing: '0.12em', textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                  whiteSpace: 'nowrap',
                }}>
                  MEZCLANDO CARTAS...
                </div>
              </div>
            </div>
          )}

          {coins.map(c => (
            <div key={c.id} className="coin-particle" style={{ left: c.left, bottom: c.bottom, animationDelay: c.delay, zIndex: 2 }}>
              {c.symbol}
            </div>
          ))}

          {game ? (
            <>
              <HandArea
                cards={isDone ? game.dealerCards : [game.dealerCards?.[0], null]}
                total={isDone ? game.dealerTotal : game.dealerVisible}
                label="Crupier"
                isPlayer={false}
                isInitialDeal={isInitialDeal}
                isDone={isDone}
              />
              <div style={{ width: '40%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 auto', position: 'relative', zIndex: 2 }} />
              
              {game.isSplit ? (
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', width: '100%', padding: '0 10px', position: 'relative', zIndex: 2 }}>
                  <div style={{
                    flex: 1, padding: '12px 8px 8px', borderRadius: 12,
                    background: game.activeHandIdx === 0 && !isDone ? 'rgba(255, 45, 122, 0.04)' : 'transparent',
                    border: game.activeHandIdx === 0 && !isDone ? '1px dashed rgba(255, 45, 122, 0.35)' : '1px solid transparent',
                    boxShadow: game.activeHandIdx === 0 && !isDone ? '0 0 15px rgba(255, 45, 122, 0.08)' : 'none',
                    transition: 'all 0.25s ease',
                  }}>
                    <HandArea
                      cards={game.hands[0]}
                      total={game.handTotals?.[0]}
                      label="Mano 1"
                      isPlayer={true}
                      isInitialDeal={isInitialDeal}
                      isDone={isDone}
                    />
                  </div>
                  <div style={{
                    flex: 1, padding: '12px 8px 8px', borderRadius: 12,
                    background: game.activeHandIdx === 1 && !isDone ? 'rgba(255, 45, 122, 0.04)' : 'transparent',
                    border: game.activeHandIdx === 1 && !isDone ? '1px dashed rgba(255, 45, 122, 0.35)' : '1px solid transparent',
                    boxShadow: game.activeHandIdx === 1 && !isDone ? '0 0 15px rgba(255, 45, 122, 0.08)' : 'none',
                    transition: 'all 0.25s ease',
                  }}>
                    <HandArea
                      cards={game.hands[1]}
                      total={game.handTotals?.[1]}
                      label="Mano 2"
                      isPlayer={true}
                      isInitialDeal={isInitialDeal}
                      isDone={isDone}
                    />
                  </div>
                </div>
              ) : (
                <HandArea
                  cards={game.playerCards}
                  total={game.playerTotal}
                  label="Tu mano"
                  isPlayer={true}
                  isInitialDeal={isInitialDeal}
                  isDone={isDone}
                />
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.18, color: '#fff' }}>♠</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.18em' }}>
                COLOCÁ TU APUESTA
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
