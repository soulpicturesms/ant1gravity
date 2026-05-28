import React, { useState } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const SUIT_RED = new Set(['♥', '♦']);

function Card({ card, hidden }) {
  if (hidden || !card) {
    return (
      <div style={{
        width: 68, height: 98, borderRadius: 9,
        background: 'linear-gradient(145deg, #1e3a8a, #1e40af)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '3px 5px 16px rgba(0,0,0,0.7)',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 5,
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
          backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,0.04) 5px,rgba(255,255,255,0.04) 10px)',
        }} />
      </div>
    );
  }
  const red = SUIT_RED.has(card.suit);
  const tc  = red ? '#cc1122' : '#0f172a';
  return (
    <div style={{
      width: 68, height: 98, borderRadius: 9,
      background: 'linear-gradient(145deg, #fff, #f4f4f4)',
      border: '1px solid #d1d5db',
      boxShadow: '3px 5px 14px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '5px 6px',
      flexShrink: 0,
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
  );
}

function HandArea({ cards, total, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.18em',
        fontFamily: "'Unbounded', system-ui", fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {(cards || []).map((c, i) => (
          <Card key={`${i}-${c ? c.value + c.suit : 'hidden'}`} card={c} hidden={!c} />
        ))}
      </div>
      {total !== undefined && (
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)',
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

  const act = async (action, extra = {}) => {
    setLoading(true); setErr('');
    try {
      if (action === 'hit' || action === 'stand') casinoAudio.playCardSlide();
      else if (action === 'double') { casinoAudio.playChip(); casinoAudio.playCardSlide(); }
      const res = await api.casinoBlackjack(action, { sessionId: game?.sessionId, ...extra });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      setGame(g => ({ ...g, ...res }));
      if (res.status === 'done') {
        setTimeout(() => {
          if (res.result === 'win' || res.result === 'blackjack') { casinoAudio.playWin(); spawnCoins(); }
          else if (res.result === 'lose' || res.result === 'bust') casinoAudio.playLose();
          else casinoAudio.playChip();
        }, 500);
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
      setGame(res);
      casinoAudio.playCardSlide();
      if (res.status === 'done') {
        setTimeout(() => {
          if (res.result === 'win' || res.result === 'blackjack') { casinoAudio.playWin(); spawnCoins(); }
          else if (res.result === 'lose' || res.result === 'bust') casinoAudio.playLose();
          else casinoAudio.playChip();
        }, 500);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const isPlaying = game?.status === 'playing';
  const isDone    = game?.status === 'done';
  const result    = isDone ? (RESULTS[game.result] || RESULTS.lose) : null;

  const half   = () => setBet(b => Math.max(10, Math.floor(b / 2)));
  const double = () => setBet(b => Math.min(balance, b * 2));
  const max    = () => setBet(balance);

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">Blackjack Pro</div>

        {/* Result summary */}
        {isDone && result && (
          <div style={{
            background: `${result.color}10`,
            border: `1px solid ${result.color}35`,
            borderRadius: 10, padding: '12px 14px', textAlign: 'center',
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
                  type="number" min="10" value={bet} disabled={loading}
                  onChange={e => setBet(Math.max(10, parseInt(e.target.value) || 10))}
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
            {game?.playerCards?.length === 2 && (
              <button onClick={() => act('double')} disabled={loading || balance < bet} style={{
                height: 48, borderRadius: 10, border: '1px solid rgba(245,197,66,0.35)',
                background: 'rgba(245,197,66,0.10)',
                color: '#f5c542', fontFamily: "'Unbounded', system-ui", fontWeight: 700, fontSize: '0.68rem',
                letterSpacing: '0.06em',
                cursor: loading || balance < bet ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loading && balance >= bet) e.currentTarget.style.background = 'rgba(245,197,66,0.2)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,197,66,0.10)'}
              >DOBLAR ×2</button>
            )}
          </div>
        ) : (
          <button onClick={start} disabled={loading || bet < 10 || bet > balance} className="roul-spin-btn">
            {loading ? 'CARGANDO...' : isDone ? 'NUEVA PARTIDA' : 'REPARTIR'}
          </button>
        )}

        <div style={{ fontSize: 10, color: 'var(--c-text4)', lineHeight: 1.6 }}>
          VS Casa · 21 · Blackjack paga 3:2<br/>
          Doblar disponible con 2 cartas
        </div>
      </div>

      {/* ── RIGHT STAGE ─────────────────────────────── */}
      <div className="casino-roul-stage" style={{ justifyContent: 'center', minHeight: 420 }}>

        {/* Green felt */}
        <div style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1e7b3c 0%, #155d2d 50%, #0f4d26 100%)',
          borderRadius: 16, border: '6px solid #2e1a06',
          boxShadow: '0 0 0 2px #3d2408, 0 0 0 4px rgba(255,45,122,0.12), 0 12px 48px rgba(0,0,0,0.9)',
          overflow: 'hidden', position: 'relative', width: '100%', minHeight: 340,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-around',
          padding: '28px 20px',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 6px)',
          }} />
          {coins.map(c => (
            <div key={c.id} className="coin-particle" style={{ left: c.left, bottom: c.bottom, animationDelay: c.delay }}>
              {c.symbol}
            </div>
          ))}
          {game ? (
            <>
              <HandArea
                cards={isDone ? game.dealerCards : [game.dealerCards?.[0], null]}
                total={isDone ? game.dealerTotal : game.dealerVisible}
                label="Crupier"
              />
              <div style={{ width: '40%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 auto' }} />
              <HandArea cards={game.playerCards} total={game.playerTotal} label="Tu mano" />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.15 }}>♠</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.18em' }}>
                COLOCÁ TU APUESTA
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
