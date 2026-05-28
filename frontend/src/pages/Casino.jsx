import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { casinoAudio } from '../utils/casinoAudio';
import Blackjack from './casino/Blackjack';
import CasinoRuleta from './casino/CasinoRuleta';
import Poker from './casino/Poker';
import Truco from './casino/Truco';
import Plinko from './casino/Plinko';
import Slots from './casino/Slots';

const GAMES = [
  {
    id: 'blackjack',
    label: 'Blackjack',
    desc: 'Clásico juego de cartas — llegá a 21',
    color: '#29b6f6',
    symbol: '♠',
    tag: 'VS CASA',
  },
  {
    id: 'ruleta',
    label: 'Ruleta',
    desc: 'American Roulette — Doble cero',
    color: '#ef5350',
    symbol: '◎',
    tag: 'VS CASA',
  },
  {
    id: 'slots',
    label: 'Tragaperras',
    desc: '5 carretes · Jackpot Global compartido',
    color: '#f5c542',
    symbol: '7',
    tag: 'JACKPOT',
  },
  {
    id: 'plinko',
    label: 'Plinko',
    desc: 'Caída libre con multiplicadores',
    color: '#26c6da',
    symbol: '◈',
    tag: 'VS CASA',
  },
  {
    id: 'poker',
    label: 'Poker',
    desc: "Texas Hold'em multijugador",
    color: '#7c4dff',
    symbol: '♣',
    tag: 'EN VIVO',
    live: true,
  },
  {
    id: 'truco',
    label: 'Truco',
    desc: 'Truco argentino 1v1 o 2v2',
    color: '#00bfa5',
    symbol: '◆',
    tag: 'EN VIVO',
    live: true,
  },
];

function GameCard({ game, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(160deg, ${game.color}20, #1e3040)`
          : `linear-gradient(160deg, ${game.color}0c, #162534)`,
        border: `1px solid ${hovered ? game.color + '50' : '#273f52'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 12px 32px ${game.color}15` : 'none',
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${game.color}, ${game.color}44)` }} />
      <div style={{ padding: '20px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: game.color + '15', border: `1px solid ${game.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: game.symbol.length === 1 ? '1.6rem' : '1.1rem',
            color: game.color, fontFamily: 'Georgia, serif', fontWeight: 700,
          }}>
            {game.symbol}
          </div>
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
            color: game.live ? '#00e676' : game.color,
            background: game.live ? 'rgba(0,230,118,0.1)' : game.color + '10',
            border: `1px solid ${game.live ? '#00e67630' : game.color + '28'}`,
            padding: '3px 8px', borderRadius: 4,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {game.live && (
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#00e676',
                display: 'inline-block', boxShadow: '0 0 5px #00e676',
              }} />
            )}
            {game.tag}
          </span>
        </div>
        <div style={{
          fontSize: '1.05rem', fontWeight: 700, color: '#c8d8e8',
          fontFamily: 'Rajdhani', letterSpacing: '0.04em', marginBottom: 5,
        }}>
          {game.label}
        </div>
        <div style={{ fontSize: '0.77rem', color: '#6a8fa8', lineHeight: 1.45, marginBottom: 16 }}>
          {game.desc}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: hovered ? game.color + '1e' : game.color + '0e',
          border: `1px solid ${game.color}35`,
          color: game.color, padding: '5px 14px', borderRadius: 6,
          fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em',
          fontFamily: 'Rajdhani', transition: 'all 0.2s',
        }}>
          Jugar ›
        </div>
      </div>
    </div>
  );
}

export default function Casino() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(user?.coins || 0);
  const [muted, setMuted] = useState(casinoAudio.muted);

  useEffect(() => { setBalance(user?.coins || 0); }, [user]);

  const refreshBalance = useCallback(() => {
    api.me && api.me().then(u => setBalance(u.coins)).catch(() => {});
  }, []);

  const activeGameDef = GAMES.find(g => g.id === activeGame);
  const toggleMute = () => {
    const nowMuted = casinoAudio.toggleMute();
    setMuted(nowMuted);
  };

  if (!user) return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.25, fontFamily: 'Georgia', color: '#c8d8e8' }}>♠</div>
        <p style={{ color: '#6a8fa8' }}>Iniciá sesión para jugar</p>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      background: '#0c1a24',
      padding: activeGame ? '24px 20px' : '36px 20px',
      maxWidth: activeGame ? 1420 : 1100,
      margin: '0 auto',
    }}>

      {/* ── LOBBY HEADER ───────────────────────────────────────── */}
      {!activeGame && (
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              fontFamily: 'Rajdhani', fontWeight: 700,
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              letterSpacing: '0.18em', color: '#c8d8e8',
            }}>
              CASINO
            </span>
            <span style={{
              fontFamily: 'Rajdhani', fontWeight: 700,
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              letterSpacing: '0.18em', color: '#29b6f6', marginLeft: '0.3em',
            }}>
              ANT1GRAVITY
            </span>
          </div>
          <div style={{
            fontSize: '0.68rem', color: '#3d5a70',
            letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 22,
          }}>
            Solo para miembros · Sin ánimo de lucro
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#162534', border: '1px solid #273f52',
            borderRadius: 10, padding: '8px 22px',
          }}>
            <span style={{ color: '#6a8fa8', fontSize: '0.72rem', fontFamily: 'Rajdhani', letterSpacing: '0.08em' }}>BALANCE</span>
            <span style={{ color: '#29b6f6', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.04em' }}>
              {balance.toLocaleString('es-AR')}
            </span>
            <span style={{ color: '#3d5a70', fontSize: '0.68rem', fontFamily: 'Rajdhani' }}>TOKENS</span>
            <button
              onClick={refreshBalance}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5a70', fontSize: '0.9rem', padding: 0, lineHeight: 1, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#29b6f6'}
              onMouseLeave={e => e.target.style.color = '#3d5a70'}
            >↻</button>
          </div>
        </div>
      )}

      {/* ── GAME HEADER (when a game is active) ───────────────── */}
      {activeGame && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid #1e3040',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setActiveGame(null)}
              style={{
                background: '#162534', border: '1px solid #273f52', color: '#6a8fa8',
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.8rem',
                letterSpacing: '0.05em', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a5f78'; e.currentTarget.style.color = '#c8d8e8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#273f52'; e.currentTarget.style.color = '#6a8fa8'; }}
            >
              ‹ Lobby
            </button>
            {activeGameDef && (
              <div>
                <div style={{
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.15rem',
                  color: '#c8d8e8', letterSpacing: '0.06em', lineHeight: 1.2,
                }}>
                  {activeGameDef.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6a8fa8', marginTop: 2 }}>
                  {activeGameDef.desc}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#162534', border: '1px solid #273f52',
              borderRadius: 8, padding: '6px 14px',
            }}>
              <span style={{ color: '#6a8fa8', fontSize: '0.68rem', fontFamily: 'Rajdhani', letterSpacing: '0.06em' }}>BALANCE</span>
              <span style={{ color: '#29b6f6', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem' }}>
                {balance.toLocaleString('es-AR')}
              </span>
              <span style={{ color: '#3d5a70', fontSize: '0.65rem', fontFamily: 'Rajdhani' }}>TK</span>
              <button
                onClick={refreshBalance}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5a70', fontSize: '0.85rem', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#29b6f6'}
                onMouseLeave={e => e.target.style.color = '#3d5a70'}
              >↻</button>
            </div>
            <button
              onClick={toggleMute}
              title={muted ? 'Activar sonido' : 'Silenciar'}
              style={{
                background: '#162534', border: '1px solid #273f52', color: '#6a8fa8',
                borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a5f78'; e.currentTarget.style.color = '#c8d8e8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#273f52'; e.currentTarget.style.color = '#6a8fa8'; }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      )}

      {/* ── GAME LOBBY ─────────────────────────────────────────── */}
      {!activeGame && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 14,
          maxWidth: 880,
          margin: '0 auto',
        }}>
          {GAMES.map(g => (
            <GameCard key={g.id} game={g} onClick={() => setActiveGame(g.id)} />
          ))}
        </div>
      )}

      {/* ── ACTIVE GAME ────────────────────────────────────────── */}
      {activeGame && (
        <>
          {activeGame === 'blackjack' && <Blackjack balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'ruleta'    && <CasinoRuleta balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'plinko'    && <Plinko balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'slots'     && <Slots balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'poker'     && <Poker user={user} balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'truco'     && <Truco user={user} balance={balance} />}
        </>
      )}
    </div>
  );
}
