import React, { useState } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const C = {
  bg:       '#0c1a24',
  surface:  '#162534',
  panel:    '#1e3040',
  border:   '#273f52',
  borderHi: '#3a5f78',
  text:     '#c8d8e8',
  textDim:  '#6a8fa8',
  textFaint:'#3d5a70',
  green:    '#00e676',
  red:      '#ff4572',
  gold:     '#f5c542',
  cyan:     '#29b6f6',
};

const SUIT_RED = new Set(['♥', '♦']);

function Card({ card, hidden }) {
  if (hidden || !card) {
    return (
      <div style={{
        width: 74, height: 106, borderRadius: 10,
        background: 'linear-gradient(145deg, #1e3a8a, #1e40af)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '3px 5px 16px rgba(0,0,0,0.7)',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 5,
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7,
          backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,0.04) 5px,rgba(255,255,255,0.04) 10px)',
        }} />
      </div>
    );
  }
  const red = SUIT_RED.has(card.suit);
  const textColor = red ? '#cc1122' : '#0f172a';
  return (
    <div style={{
      width: 74, height: 106, borderRadius: 10,
      background: 'linear-gradient(145deg, #ffffff, #f4f4f4)',
      border: '1px solid #d1d5db',
      boxShadow: '3px 5px 14px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '5px 7px',
      flexShrink: 0, position: 'relative',
    }}>
      <div style={{ color: textColor, lineHeight: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Georgia, serif' }}>{card.value}</div>
        <div style={{ fontSize: '0.75rem' }}>{card.suit}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '1.9rem', color: textColor, lineHeight: 1 }}>{card.suit}</div>
      <div style={{ color: textColor, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Georgia, serif' }}>{card.value}</div>
        <div style={{ fontSize: '0.75rem' }}>{card.suit}</div>
      </div>
    </div>
  );
}

function HandArea({ cards, total, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: 12,
        textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'Rajdhani', fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {(cards || []).map((c, i) => (
          <Card key={`${i}-${c ? c.value + c.suit : 'hidden'}`} card={c} hidden={!c} />
        ))}
      </div>
      {total !== undefined && (
        <div style={{
          display: 'inline-block',
          background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '4px 18px',
          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem',
          color: total > 21 ? C.red : total === 21 ? C.gold : 'white',
        }}>
          {total > 21 ? total : total}
        </div>
      )}
    </div>
  );
}

const RESULTS = {
  win:       { label: 'Ganaste',    color: C.green, prefix: '+' },
  blackjack: { label: 'Blackjack',  color: C.gold,  prefix: '+' },
  push:      { label: 'Empate',     color: C.cyan,  prefix: '' },
  lose:      { label: 'Perdiste',   color: C.red,   prefix: '' },
  bust:      { label: 'Te pasaste', color: C.red,   prefix: '' },
};

function BetInput({ value, onChange, balance, disabled }) {
  const half = () => onChange(Math.max(10, Math.floor(value / 2)));
  const double = () => onChange(Math.min(balance, value * 2));
  const max = () => onChange(balance);

  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 46 }}>
        <span style={{ color: C.textFaint, fontSize: '0.7rem', fontFamily: 'Rajdhani', letterSpacing: '0.1em', flexShrink: 0, marginRight: 8 }}>APUESTA</span>
        <input
          type="number" min="10" value={value} disabled={disabled}
          onChange={e => onChange(Math.max(10, parseInt(e.target.value) || 10))}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: C.text, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', textAlign: 'right',
          }}
        />
        <span style={{ color: C.textFaint, fontSize: '0.7rem', fontFamily: 'Rajdhani', marginLeft: 6, flexShrink: 0 }}>TK</span>
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${C.panel}` }}>
        {[
          { label: '½', action: half },
          { label: '2×', action: double },
          { label: 'MAX', action: max },
        ].map((btn, i, arr) => (
          <button key={btn.label} onClick={btn.action} disabled={disabled} style={{
            flex: 1, background: 'none',
            border: 'none',
            borderRight: i < arr.length - 1 ? `1px solid ${C.panel}` : 'none',
            color: C.textDim, padding: '7px 0',
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.75rem',
            cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!disabled) { e.target.style.color = C.cyan; e.target.style.background = C.surface; }}}
          onMouseLeave={e => { e.target.style.color = C.textDim; e.target.style.background = 'none'; }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Blackjack({ balance, onBalanceChange }) {
  const [bet, setBet]     = useState(100);
  const [game, setGame]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');
  const [coins, setCoins] = useState([]);

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

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>

      {/* ── TABLE ── */}
      <div style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1e7b3c 0%, #155d2d 50%, #0f4d26 100%)',
        borderRadius: 18, border: '8px solid #5c3010',
        boxShadow: '0 0 0 3px #9b6d28, 0 10px 44px rgba(0,0,0,0.8)',
        overflow: 'hidden', position: 'relative', minHeight: 260,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)',
        }} />

        {coins.map(c => (
          <div key={c.id} className="coin-particle" style={{ left: c.left, bottom: c.bottom, animationDelay: c.delay }}>
            {c.symbol}
          </div>
        ))}

        <div style={{ position: 'relative', padding: '28px 24px' }}>

          {err && (
            <div style={{
              background: 'rgba(255,69,114,0.18)', border: '1px solid rgba(255,69,114,0.4)',
              borderRadius: 8, padding: '8px 14px', marginBottom: 16,
              fontSize: '0.85rem', color: '#ff8aaa', textAlign: 'center',
            }}>
              {err}
            </div>
          )}

          {/* Result banner */}
          {isDone && result && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-block',
                background: `${result.color}18`,
                border: `2px solid ${result.color}45`,
                borderRadius: 12, padding: '14px 36px',
              }}>
                <div style={{
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.9rem',
                  color: result.color, letterSpacing: '0.08em',
                }}>
                  {result.label}
                </div>
                {game.payout > 0 && (
                  <div style={{ color: C.gold, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', marginTop: 4 }}>
                    {result.prefix}{game.payout.toLocaleString('es-AR')} TK
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dealer */}
          {game && (
            <div style={{ marginBottom: 20 }}>
              <HandArea
                cards={isDone ? game.dealerCards : [game.dealerCards?.[0], null]}
                total={isDone ? game.dealerTotal : game.dealerVisible}
                label="Crupier"
              />
            </div>
          )}

          {game && <div style={{ width: '55%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />}

          {/* Player */}
          {game && (
            <HandArea cards={game.playerCards} total={game.playerTotal} label="Tu mano" />
          )}

          {!game && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'Rajdhani', letterSpacing: '0.2em' }}>
                SELECCIONÁ TU APUESTA
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{
        marginTop: 12, background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px',
      }}>
        {!game || isDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BetInput value={bet} onChange={setBet} balance={balance} disabled={loading} />
            {bet > balance && (
              <div style={{ fontSize: '0.75rem', color: C.red, fontFamily: 'Rajdhani', textAlign: 'center' }}>
                Tokens insuficientes
              </div>
            )}
            <button onClick={start} disabled={loading || bet < 10 || bet > balance} style={{
              height: 48, borderRadius: 10, border: 'none',
              background: loading || bet > balance
                ? 'rgba(0,230,118,0.08)'
                : 'linear-gradient(135deg, #00c65a, #00e676)',
              color: loading || bet > balance ? '#3d5a70' : '#0c1a24',
              fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em',
              cursor: loading || bet > balance ? 'not-allowed' : 'pointer',
              fontFamily: 'Rajdhani',
              boxShadow: (!loading && bet <= balance) ? '0 0 16px rgba(0,230,118,0.25)' : 'none',
              transition: 'all 0.2s',
            }}>
              {loading ? 'CARGANDO...' : isDone ? 'NUEVA PARTIDA' : 'REPARTIR'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => act('hit')} disabled={loading} style={{
              flex: 1, height: 46, borderRadius: 10, border: 'none',
              background: loading ? 'rgba(41,182,246,0.08)' : 'linear-gradient(135deg, #0288d1, #29b6f6)',
              color: loading ? '#3d5a70' : '#0c1a24',
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>
              PEDIR
            </button>
            <button onClick={() => act('stand')} disabled={loading} style={{
              flex: 1, height: 46, borderRadius: 10,
              border: `1px solid ${C.borderHi}`,
              background: C.panel,
              color: C.text, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}>
              PLANTARSE
            </button>
            {game.playerCards?.length === 2 && (
              <button onClick={() => act('double')} disabled={loading || balance < bet} style={{
                flex: 1, height: 46, borderRadius: 10,
                border: `1px solid ${C.gold}40`,
                background: 'rgba(245,197,66,0.1)',
                color: C.gold, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em',
                cursor: loading || balance < bet ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!loading && balance >= bet) e.currentTarget.style.background = 'rgba(245,197,66,0.18)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,197,66,0.1)'}
              >
                DOBLAR ×2
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
