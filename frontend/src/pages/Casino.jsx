import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useGameSocket } from '../context/SocketContext';
import Blackjack from './casino/Blackjack';
import CasinoRuleta from './casino/CasinoRuleta';
import Poker from './casino/Poker';
import Truco from './casino/Truco';

const GAMES = [
  { id: 'blackjack', label: '🃏 Blackjack', desc: 'Vos contra la casa — llega a 21 sin pasarte', color: '#00d4ff' },
  { id: 'ruleta',    label: '🎰 Ruleta',    desc: 'Apostá a números, colores y grupos', color: '#ffd700' },
  { id: 'poker',     label: '♠️ Poker',     desc: 'Texas Hold\'em multijugador en vivo', color: '#a78bfa' },
  { id: 'truco',     label: '🀄 Truco',     desc: 'Truco argentino 1v1 o 2v2 en vivo', color: '#00e8c0' },
];

export default function Casino() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(user?.coins || 0);

  const refreshBalance = useCallback(async () => {
    try {
      const { data } = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json());
      if (data?.coins !== undefined) setBalance(data.coins);
    } catch {}
    api.me && api.me().then(u => setBalance(u.coins)).catch(() => {});
  }, []);

  useEffect(() => { setBalance(user?.coins || 0); }, [user]);

  if (!user) return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}><div className="empty-icon">🎰</div><p>Iniciá sesión para jugar</p></div>
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '0.15em', color: 'white', lineHeight: 1 }}>
          🎰 CASINO <span style={{ color: '#ffd700' }}>ANT1GRAVITY</span>
        </div>
        <div style={{ marginTop: 8, color: '#6a6a8a', fontFamily: 'Rajdhani', fontSize: '1rem', letterSpacing: '0.2em' }}>SIN ÁNIMO DE LUCRO · SOLO PARA MIEMBROS</div>
        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: '6px 20px' }}>
          <span style={{ color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem' }}>⚡ {balance.toLocaleString('es-AR')} tokens</span>
        </div>
      </div>

      {/* Game lobby */}
      {!activeGame && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {GAMES.map(g => (
            <div key={g.id} onClick={() => setActiveGame(g.id)} style={{
              background: `linear-gradient(135deg, ${g.color}10, #0a0a14)`,
              border: `1px solid ${g.color}33`,
              borderRadius: 14, padding: '28px 20px', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s',
              boxShadow: `0 0 0 0 ${g.color}44`,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = g.color + '88'; e.currentTarget.style.boxShadow = `0 0 20px ${g.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = g.color + '33'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>{g.label.split(' ')[0]}</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: g.color, letterSpacing: '0.1em', marginBottom: 8 }}>{g.label.split(' ').slice(1).join(' ')}</div>
              <div style={{ fontSize: '0.85rem', color: '#6a6a8a' }}>{g.desc}</div>
              <div style={{ marginTop: 16 }}>
                <span style={{ padding: '6px 20px', borderRadius: 6, background: g.color + '20', border: `1px solid ${g.color}44`, color: g.color, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                  Jugar →
                </span>
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
