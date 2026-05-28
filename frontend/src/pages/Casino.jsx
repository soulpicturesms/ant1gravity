import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Blackjack from './casino/Blackjack';
import CasinoRuleta from './casino/CasinoRuleta';
import Poker from './casino/Poker';
import Truco from './casino/Truco';

const GAMES = [
  { id: 'blackjack', label: '🃏 Blackjack', desc: 'Vos contra la casa — llega a 21 sin pasarte', color: '#00d4ff', icon: '🃏' },
  { id: 'ruleta',    label: '🎰 Ruleta',    desc: 'Apostá a números, colores y grupos',          color: '#ffd700', icon: '🎰' },
  { id: 'poker',     label: '♠ Poker',      desc: 'Texas Hold\'em multijugador en vivo',          color: '#a78bfa', icon: '♠' },
  { id: 'truco',     label: '🀄 Truco',     desc: 'Truco argentino 1v1 o 2v2 en vivo',            color: '#00e8c0', icon: '🀄' },
];

export default function Casino() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(user?.coins || 0);

  useEffect(() => { setBalance(user?.coins || 0); }, [user]);

  const refreshBalance = useCallback(() => {
    api.me && api.me().then(u => setBalance(u.coins)).catch(() => {});
  }, []);

  if (!user) return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div className="empty-icon">🎰</div>
        <p>Iniciá sesión para jugar</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '0.15em', color: 'white', lineHeight: 1 }}>
          🎰 CASINO <span style={{ color: '#ffd700' }}>ANT1GRAVITY</span>
        </div>
        <div style={{ marginTop: 6, color: '#6a6a8a', fontFamily: 'Rajdhani', fontSize: '0.9rem', letterSpacing: '0.2em' }}>SIN ÁNIMO DE LUCRO · SOLO PARA MIEMBROS</div>
        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 20, padding: '6px 20px' }}>
          <span style={{ color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem' }}>⚡ {balance.toLocaleString('es-AR')} tokens</span>
          <button onClick={refreshBalance} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#4a4a6a', fontFamily: 'Rajdhani' }}>↻</button>
        </div>
      </div>

      {/* Game lobby */}
      {!activeGame && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, maxWidth: 920, margin: '0 auto' }}>
          {GAMES.map(g => (
            <div key={g.id} onClick={() => setActiveGame(g.id)} style={{
              background: `linear-gradient(135deg,${g.color}12,#0a0a14)`,
              border: `1px solid ${g.color}30`,
              borderRadius: 16, padding: '26px 18px 22px', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = g.color+'70'; e.currentTarget.style.background = `linear-gradient(135deg,${g.color}1e,#0a0a14)`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${g.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = g.color+'30'; e.currentTarget.style.background = `linear-gradient(135deg,${g.color}12,#0a0a14)`; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 10, lineHeight: 1 }}>{g.icon}</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.35rem', color: g.color, letterSpacing: '0.06em', marginBottom: 6 }}>{g.label.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize: '0.82rem', color: '#6a6a8a', lineHeight: 1.4, marginBottom: 16 }}>{g.desc}</div>
              <div style={{ display: 'inline-block', padding: '6px 22px', borderRadius: 6, background: g.color+'18', border: `1px solid ${g.color}40`, color: g.color, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                Jugar →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active game */}
      {activeGame && (
        <div>
          <button onClick={() => setActiveGame(null)} style={{
            background: 'transparent', border: '1px solid #1e1e30', color: '#9090b0',
            borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
            fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.85rem', marginBottom: 20,
          }}>← Volver al lobby</button>

          {activeGame === 'blackjack' && <Blackjack balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'ruleta'    && <CasinoRuleta balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'poker'     && <Poker user={user} balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'truco'     && <Truco user={user} balance={balance} />}
        </div>
      )}
    </div>
  );
}
