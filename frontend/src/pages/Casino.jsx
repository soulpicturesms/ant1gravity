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
import './casino/casino.css';

const GAMES = [
  {
    id: 'blackjack',
    name: 'Blackjack Pro',
    desc: 'VS Casa · 21',
    bg: 'linear-gradient(135deg, #0f2a1e, #071510)',
    art: '♠',
    tag: 'live',  live: 2412,
  },
  {
    id: 'ruleta',
    name: 'Ruleta Americana',
    desc: 'Doble cero · RTP 94.7%',
    bg: 'linear-gradient(135deg, #2a1010, #130606)',
    art: '◎',
    tag: 'hot', live: 1186,
  },
  {
    id: 'slots',
    name: 'Anti-Gravity Slots',
    desc: '5 carretes · Jackpot global',
    bg: 'linear-gradient(135deg, #1e0f2a, #0d0614)',
    art: '✦',
    tag: 'new', live: 8240,
  },
  {
    id: 'plinko',
    name: 'Plinko Zero-G',
    desc: 'Caída libre · multiplicadores',
    bg: 'linear-gradient(135deg, #0e1f2e, #07111a)',
    art: '●',
    tag: null, live: 1820,
  },
  {
    id: 'poker',
    name: "Texas Hold'em",
    desc: 'Multijugador · EN VIVO',
    bg: 'linear-gradient(135deg, #0f2a1e, #071510)',
    art: '♣',
    tag: 'live', live: 412,
  },
  {
    id: 'truco',
    name: 'Truco Argentino',
    desc: '1v1 o 2v2 · EN VIVO',
    bg: 'linear-gradient(135deg, #1a2210, #0a1208)',
    art: '◆',
    tag: 'live', live: 280,
  },
];

function GameCard({ game, onClick }) {
  return (
    <div className="casino-gcard" onClick={onClick}>
      <div className="casino-gcard__bg" style={{ background: game.bg }} />
      <div className="casino-gcard__art">{game.art}</div>
      {/* Live count — top left */}
      {game.live > 0 && (
        <div className="casino-gcard__live">{game.live.toLocaleString()}</div>
      )}
      {/* Tag — top right */}
      {game.tag === 'hot'  && <span className="casino-gcard__tag casino-gcard__tag--hot">HOT</span>}
      {game.tag === 'new'  && <span className="casino-gcard__tag casino-gcard__tag--new">NEW</span>}
      {game.tag === 'live' && <span className="casino-gcard__tag">● LIVE</span>}
      <div className="casino-gcard__label">
        <span className="casino-gcard__name">{game.name}</span>
        <span className="casino-gcard__desc">{game.desc}</span>
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
  const toggleMute = () => setMuted(casinoAudio.toggleMute());

  if (!user) return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.2, fontFamily: 'Georgia' }}>♠</div>
        <p style={{ color: '#6a8fa8' }}>Iniciá sesión para jugar</p>
      </div>
    </div>
  );

  return (
    <div className="casino-shell" style={{ minHeight: 'calc(100vh - 70px)' }}>

      {/* ── GAME ACTIVE HEADER ─────────────────────────────── */}
      {activeGame && (
        <div className="casino-game-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="casino-back-btn" onClick={() => setActiveGame(null)}>
              ‹ Lobby
            </button>
            {activeGameDef && (
              <div>
                <div className="casino-game-title">{activeGameDef.name}</div>
                <div className="casino-game-subdesc">{activeGameDef.desc}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="casino-balance-badge">
              <span style={{ fontSize: 9, fontFamily: 'Unbounded,system-ui', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--c-text4)', textTransform: 'uppercase' }}>Balance</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--c-accent2)' }}>
                {balance.toLocaleString('es-AR')}
              </span>
              <span style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: 'Inter,sans-serif' }}>TK</span>
              <button
                onClick={refreshBalance}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text4)', fontSize: '0.9rem', padding: 0, lineHeight: 1, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--c-accent2)'}
                onMouseLeave={e => e.target.style.color = 'var(--c-text4)'}
              >↻</button>
            </div>
            <button className="casino-mute-btn" onClick={toggleMute} title={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      )}

      {/* ── LOBBY ──────────────────────────────────────────── */}
      {!activeGame && (
        <div className="casino-lobby">

          {/* Hero */}
          <div className="casino-hero">
            <div className="casino-hero__content">
              <div className="casino-hero__title">
                Apuesta sin <span className="c-acc">gravedad</span>.
              </div>
              <p className="casino-hero__sub">
                6 juegos originales · Solo para miembros · Sin ánimo de lucro.
              </p>
              <div className="casino-hero__actions">
                <button
                  className="casino-hero-btn"
                  onClick={() => setActiveGame('ruleta')}
                >
                  Jugar ahora
                </button>
              </div>
            </div>
            <div className="casino-hero__art" />
            <div className="casino-hero__chips">
              <div className="casino-chip-big">100</div>
              <div className="casino-chip-big">500</div>
              <div className="casino-chip-big">1K</div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="casino-stat-strip">
            <div className="casino-stat-cell">
              <span className="casino-stat-label">Jugando ahora</span>
              <span className="casino-stat-val">14,082</span>
              <span className="casino-stat-delta">+8.2% hoy</span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">Pagado 24h</span>
              <span className="casino-stat-val" style={{ color: 'var(--c-accent2)' }}>2.4M</span>
              <span className="casino-stat-delta">+12.4%</span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">RTP promedio</span>
              <span className="casino-stat-val">96.8%</span>
              <span className="casino-stat-delta">verificado</span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">Big win</span>
              <span className="casino-stat-val" style={{ color: 'var(--c-accent)' }}>184,200</span>
              <span className="casino-stat-delta">hace 12 min</span>
            </div>
          </div>

          {/* Games */}
          <div className="casino-section-head">
            <h2>Juegos <span className="c-acc">ant1gravity</span></h2>
          </div>
          <div className="casino-gcards">
            {GAMES.map(g => (
              <GameCard key={g.id} game={g} onClick={() => setActiveGame(g.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIVE GAME ────────────────────────────────────── */}
      {activeGame && (
        <div className="casino-game-wrap">
          {activeGame === 'blackjack' && <Blackjack balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'ruleta'    && <CasinoRuleta balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'plinko'    && <Plinko balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'slots'     && <Slots balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'poker'     && <Poker user={user} balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'truco'     && <Truco user={user} balance={balance} />}
        </div>
      )}
    </div>
  );
}
