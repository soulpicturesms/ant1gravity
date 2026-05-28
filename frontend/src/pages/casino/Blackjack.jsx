import React, { useState } from 'react';
import { api } from '../../api/api';

const SUIT_COLOR = { '♥': '#ff4466', '♦': '#ff4466', '♠': '#e0e0f0', '♣': '#e0e0f0' };

function Card({ card, hidden }) {
  if (hidden || !card) return (
    <div style={{ width: 64, height: 96, borderRadius: 8, background: 'linear-gradient(135deg, #1a1a2e, #0f0f22)', border: '2px solid #00d4ff33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#1e1e30', flexShrink: 0 }}>🂠</div>
  );
  return (
    <div style={{ width: 64, height: 96, borderRadius: 8, background: 'linear-gradient(135deg, #1a1a2e, #12122a)', border: '2px solid #2a2a3e', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px 8px', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: SUIT_COLOR[card.suit], lineHeight: 1 }}>{card.value}</div>
      <div style={{ textAlign: 'center', fontSize: '1.4rem', color: SUIT_COLOR[card.suit], lineHeight: 1 }}>{card.suit}</div>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: SUIT_COLOR[card.suit], lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.value}</div>
    </div>
  );
}

function Hand({ cards, total, label, dealerVisible }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Rajdhani' }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {(cards || []).map((c, i) => <Card key={i} card={c} hidden={!c} />)}
      </div>
      {total !== undefined && (
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: total > 21 ? '#ff4466' : total === 21 ? '#ffd700' : '#e0e0f0' }}>
          {total > 21 ? '💥 Pasado' : `${total}`}
        </div>
      )}
    </div>
  );
}

const RESULT_STYLES = {
  win:       { label: '🎉 ¡Ganaste!',   color: '#00cc66' },
  blackjack: { label: '⭐ ¡Blackjack!', color: '#ffd700' },
  push:      { label: '🤝 Empate',      color: '#00d4ff' },
  lose:      { label: '💸 Perdiste',    color: '#ff4466' },
  bust:      { label: '💥 Te pasaste',  color: '#ff4466' },
};

export default function Blackjack({ balance, onBalanceChange }) {
  const [bet, setBet] = useState('100');
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

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
      const res = await api.casinoBlackjack('start', { bet: parseInt(bet) });
      if (res.balance !== undefined) onBalanceChange(res.balance);
      setGame(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const isPlaying = game?.status === 'playing';
  const isDone    = game?.status === 'done';
  const result    = isDone ? RESULT_STYLES[game.result] || RESULT_STYLES.lose : null;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card" style={{ border: '1px solid rgba(0,212,255,0.2)', background: 'linear-gradient(135deg, #0a0a18, #0f0f22)' }}>
        <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: '#00d4ff', letterSpacing: '0.1em', marginBottom: 24 }}>
          🃏 BLACKJACK
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 16 }}>{err}</div>}

        {/* Result banner */}
        {isDone && result && (
          <div style={{ textAlign: 'center', marginBottom: 24, padding: '16px', background: result.color + '15', border: `2px solid ${result.color}44`, borderRadius: 10 }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.8rem', color: result.color }}>{result.label}</div>
            {game.payout > 0 && <div style={{ color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', marginTop: 4 }}>+{game.payout.toLocaleString('es-AR')} tokens</div>}
          </div>
        )}

        {/* Dealer */}
        {game && (
          <>
            <Hand
              cards={isDone ? game.dealerCards : [game.dealerCards?.[0], null]}
              total={isDone ? game.dealerTotal : game.dealerVisible}
              label="Crupier"
            />
            <div style={{ width: '100%', height: 1, background: '#1e1e30', margin: '20px 0' }} />
            <Hand cards={game.playerCards} total={game.playerTotal} label="Tu mano" />
          </>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24 }}>
          {!game || isDone ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[50,100,200,500,1000].map(v => (
                  <button key={v} onClick={() => setBet(String(v))} style={{
                    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem',
                    border: `1px solid ${bet === String(v) ? '#ffd700' : '#1e1e30'}`,
                    background: bet === String(v) ? 'rgba(255,215,0,0.1)' : 'transparent',
                    color: bet === String(v) ? '#ffd700' : '#6a6a8a',
                  }}>{v >= 1000 ? `${v/1000}K` : v}</button>
                ))}
                <input className="input" type="number" min="10" value={bet} onChange={e => setBet(e.target.value)} style={{ width: 100, textAlign: 'center' }} />
              </div>
              <button className="btn btn-primary" onClick={start} disabled={loading || !bet || parseInt(bet) < 10} style={{ padding: '10px 40px', fontSize: '1rem', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                {loading ? '...' : isDone ? '🔄 Nueva partida' : '🃏 Repartir'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => act('hit')} disabled={loading} style={{ minWidth: 100 }}>
                Pedir
              </button>
              <button className="btn btn-secondary" onClick={() => act('stand')} disabled={loading} style={{ minWidth: 100 }}>
                Plantarse
              </button>
              {game.playerCards?.length === 2 && (
                <button className="btn btn-sm" onClick={() => act('double')} disabled={loading || balance < parseInt(bet)}
                  style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                  Doblar ×2
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
