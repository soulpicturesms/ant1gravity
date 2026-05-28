import React, { useState } from 'react';
import { api } from '../../api/api';

const SUIT_RED = new Set(['♥', '♦']);

function Card({ card, hidden }) {
  if (hidden || !card) {
    return (
      <div style={{
        width: 72, height: 102, borderRadius: 9,
        background: 'linear-gradient(145deg,#1e3a8a,#1e40af)',
        border: '2px solid rgba(255,255,255,0.12)',
        boxShadow: '3px 5px 14px rgba(0,0,0,0.65)',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6, backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,0.05) 5px,rgba(255,255,255,0.05) 10px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'rgba(255,255,255,0.1)' }}>🂠</div>
      </div>
    );
  }
  const red = SUIT_RED.has(card.suit);
  const color = red ? '#cc1122' : '#0f172a';
  return (
    <div style={{
      width: 72, height: 102, borderRadius: 9,
      background: 'linear-gradient(145deg,#ffffff,#f4f4f4)',
      border: '1px solid #d1d5db',
      boxShadow: '3px 5px 14px rgba(0,0,0,0.55)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '5px 7px',
      flexShrink: 0, position: 'relative',
    }}>
      <div style={{ color, lineHeight: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Georgia,serif' }}>{card.value}</div>
        <div style={{ fontSize: '0.75rem' }}>{card.suit}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '1.8rem', color, lineHeight: 1 }}>{card.suit}</div>
      <div style={{ color, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Georgia,serif' }}>{card.value}</div>
        <div style={{ fontSize: '0.75rem' }}>{card.suit}</div>
      </div>
    </div>
  );
}

function HandArea({ cards, total, label, dealerHidden }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'Rajdhani', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {(cards || []).map((c, i) => (
          <Card key={i} card={c} hidden={dealerHidden && i === 1 && !c} />
        ))}
      </div>
      {total !== undefined && (
        <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 16px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: total > 21 ? '#ef4444' : total === 21 ? '#ffd700' : 'white' }}>
          {total > 21 ? `💥 ${total}` : total}
        </div>
      )}
    </div>
  );
}

const RESULTS = {
  win:       { label: '🎉 ¡Ganaste!',    color: '#22c55e' },
  blackjack: { label: '⭐ ¡Blackjack!',  color: '#ffd700' },
  push:      { label: '🤝 Empate',        color: '#00d4ff' },
  lose:      { label: '💸 Perdiste',      color: '#ef4444' },
  bust:      { label: '💥 Te pasaste',    color: '#ef4444' },
};

const CHIP_VALUES = [50, 100, 200, 500, 1000];

export default function Blackjack({ balance, onBalanceChange }) {
  const [bet, setBet]   = useState(100);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]   = useState('');

  const act = async (action, extra = {}) => {
    setLoading(true); setErr('');
    try {
      const res = await api.casinoBlackjack(action, { sessionId: game?.sessionId, ...extra });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      setGame(g => ({ ...g, ...res }));
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const start = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.casinoBlackjack('start', { bet });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      setGame(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const isPlaying = game?.status === 'playing';
  const isDone    = game?.status === 'done';
  const result    = isDone ? (RESULTS[game.result] || RESULTS.lose) : null;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>

      {/* Green felt table */}
      <div style={{
        background: 'radial-gradient(ellipse at 50% 30%,#1e7b3c 0%,#155d2d 50%,#0f4d26 100%)',
        borderRadius: 20, border: '8px solid #5c3010',
        boxShadow: '0 0 0 3px #9b6d28, 0 8px 40px rgba(0,0,0,0.8)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Felt texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', padding: '28px 24px' }}>
          {/* Title */}
          <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.3em', marginBottom: 24, textTransform: 'uppercase' }}>
            ✦ Blackjack ✦
          </div>

          {err && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#fca5a5', textAlign: 'center' }}>
              {err}
            </div>
          )}

          {/* Result banner */}
          {isDone && result && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-block', background: `${result.color}22`, border: `2px solid ${result.color}55`, borderRadius: 12, padding: '14px 32px' }}>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: result.color, letterSpacing: '0.05em' }}>{result.label}</div>
                {game.payout > 0 && (
                  <div style={{ color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', marginTop: 4 }}>
                    +{game.payout.toLocaleString('es-AR')} tokens
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dealer hand */}
          {game && (
            <div style={{ marginBottom: 20 }}>
              <HandArea
                cards={isDone ? game.dealerCards : [game.dealerCards?.[0], null]}
                total={isDone ? game.dealerTotal : game.dealerVisible}
                label="Crupier"
              />
            </div>
          )}

          {/* Divider */}
          {game && <div style={{ width: '60%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />}

          {/* Player hand */}
          {game && (
            <HandArea
              cards={game.playerCards}
              total={game.playerTotal}
              label="Tu mano"
            />
          )}

          {/* No game yet */}
          {!game && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8, opacity: 0.3 }}>🃏</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Rajdhani', fontSize: '1.1rem', letterSpacing: '0.1em' }}>SELECCIONÁ TU APUESTA</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls (outside the table) */}
      <div className="card" style={{ marginTop: 16, border: '1px solid rgba(255,215,0,0.15)' }}>
        {!game || isDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            {/* Chip quick-select */}
            <div>
              <div style={{ fontSize: '0.72rem', color: '#6a6a8a', textAlign: 'center', marginBottom: 8, fontFamily: 'Rajdhani', letterSpacing: '0.1em' }}>APUESTA</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {CHIP_VALUES.map(v => (
                  <button key={v} onClick={() => setBet(v)} style={{
                    width: 54, height: 54, borderRadius: '50%', cursor: 'pointer',
                    background: bet === v ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${bet === v ? '#ffd700' : 'rgba(255,255,255,0.15)'}`,
                    color: bet === v ? '#ffd700' : '#9090b0',
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem',
                    boxShadow: bet === v ? '0 0 14px rgba(255,215,0,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {v >= 1000 ? `${v/1000}K` : v}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <input className="input" type="number" min="10" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: 110, textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem' }} />
                <span style={{ fontSize: '0.75rem', color: '#4a4a6a', fontFamily: 'Rajdhani' }}>tokens</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={start} disabled={loading || bet < 10 || bet > balance}
              style={{ padding: '12px 48px', fontSize: '1.05rem', fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.08em' }}>
              {loading ? '...' : isDone ? '🔄 Nueva Partida' : '🃏 Repartir'}
            </button>
            {bet > balance && <div style={{ fontSize: '0.78rem', color: '#ef4444', fontFamily: 'Rajdhani' }}>Tokens insuficientes</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => act('hit')} disabled={loading}
              style={{ padding: '12px 36px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem' }}>
              Pedir carta
            </button>
            <button className="btn btn-secondary" onClick={() => act('stand')} disabled={loading}
              style={{ padding: '12px 36px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem' }}>
              Plantarse
            </button>
            {game.playerCards?.length === 2 && (
              <button onClick={() => act('double')} disabled={loading || balance < bet}
                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,215,0,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,215,0,0.12)'}>
                Doblar ×2
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
