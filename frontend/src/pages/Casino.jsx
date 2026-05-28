import React, { useState, useEffect, useCallback, useRef } from 'react';
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

class WinCoinParticle {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    // 60% geyser (shoots up from bottom center), 40% rain (falls from top)
    if (Math.random() > 0.4) {
      this.x = w / 2 + (Math.random() - 0.5) * 120;
      this.y = h + 10;
      this.vx = (Math.random() - 0.5) * 14;
      this.vy = -16 - Math.random() * 14;
    } else {
      this.x = Math.random() * w;
      this.y = -20 - Math.random() * 60;
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = 2 + Math.random() * 5;
    }
    this.gravity = 0.5;
    this.frame = Math.floor(Math.random() * 8);
    this.frameSpeed = 0.16 + Math.random() * 0.14;
    this.scale = 2.5 + Math.random() * 2.0; // Scaled up pixel art
    this.opacity = 1;
    this.active = true;
  }
  update() {
    this.x += this.vx;
    this.vy += this.gravity;
    this.y += this.vy;
    this.frame = (this.frame + this.frameSpeed) % 8;
    if (this.y > this.h + 20) {
      this.active = false;
    }
  }
  draw(ctx, frames) {
    if (!this.active || frames.length === 0) return;
    const img = frames[Math.floor(this.frame)];
    const size = 16 * this.scale;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
    ctx.restore();
  }
}

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

function parseWin(row) {
  const { username, amount, reason, created_at } = row;
  let game = 'Casino', bet = null, mult = null;

  if (reason) {
    if (reason.startsWith('Blackjack')) {
      game = 'Blackjack Pro';
      const betMatch = reason.match(/apuesta:\s*(\d+)/i);
      if (betMatch) {
        bet = parseInt(betMatch[1]);
        mult = bet > 0 ? `${((bet + amount) / bet).toFixed(1)}x` : null;
      }
    } else if (reason.startsWith('Plinko')) {
      game = 'Plinko Zero-G';
      const multMatch = reason.match(/\(x([\d.]+)\)/);
      if (multMatch) mult = `${multMatch[1]}x`;
      const betMatch = reason.match(/apuesta:\s*(\d+)/i);
      if (betMatch) bet = parseInt(betMatch[1]);
    } else if (reason.startsWith('Tragaperras')) {
      game = 'Anti-Gravity Slots';
      const betMatch = reason.match(/Apuesta:\s*(\d+)/);
      const gainMatch = reason.match(/Ganancia:\s*(\d+)/);
      if (betMatch) bet = parseInt(betMatch[1]);
      if (betMatch && gainMatch) {
        const gain = parseInt(gainMatch[1]);
        mult = bet > 0 ? `${(gain / bet).toFixed(1)}x` : null;
      }
    } else if (reason.startsWith('Ruleta')) {
      game = 'Ruleta Americana';
    } else if (reason.startsWith('Blackjack Split')) {
      game = 'Blackjack Pro';
      const betMatch = reason.match(/apuesta total:\s*(\d+)/i);
      if (betMatch) {
        bet = parseInt(betMatch[1]);
        mult = bet > 0 ? `${((bet + amount) / bet).toFixed(1)}x` : null;
      }
    }
  }

  return { user: username || 'anónimo', game, bet, win: amount, mult };
}

function LiveWinsTicker() {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWins = useCallback(() => {
    api.casinoRecentWins()
      .then(data => { setWins(data.map(parseWin)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchWins();
    const id = setInterval(fetchWins, 15000);
    return () => clearInterval(id);
  }, [fetchWins]);

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
      Cargando ganadores...
    </div>
  );

  if (!wins.length) return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
      Aún no hay ganadores registrados. ¡Sé el primero!
    </div>
  );

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line2)', borderRadius: '14px', overflow: 'hidden', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-line)' }}>
            {["Jugador", "Juego", "Apuesta", "Multi", "Ganancia"].map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px',
                fontFamily: 'Unbounded, system-ui',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--c-text4)',
                textAlign: i >= 2 ? 'right' : 'left'
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wins.map((w, i) => (
            <tr key={i} style={{ borderBottom: i < wins.length - 1 ? '1px solid var(--c-line)' : 'none' }}>
              <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-surface3)', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--c-text3)' }}>
                    {w.user[0].toUpperCase()}
                  </span>
                  {w.user}
                </span>
              </td>
              <td style={{ padding: '12px 14px', color: 'var(--c-text2)' }}>{w.game}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--c-text3)' }}>
                {w.bet != null ? w.bet.toLocaleString() : '—'}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--c-accent)' }}>
                {w.mult || '—'}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--c-accent2)' }}>
                +{w.win.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Casino() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(user?.coins || 0);
  const [muted, setMuted] = useState(casinoAudio.muted);
  const [winBanner, setWinBanner] = useState(null);

  const celebrationCanvasRef = useRef(null);
  const celebrationParticlesRef = useRef([]);
  const celebrationAnimRef = useRef(null);
  const coinFramesRef = useRef([]);

  useEffect(() => { setBalance(user?.coins || 0); }, [user]);

  const refreshBalance = useCallback(() => {
    api.me && api.me().then(u => setBalance(u.coins)).catch(() => {});
  }, []);

  const activeGameDef = GAMES.find(g => g.id === activeGame);
  const toggleMute = () => setMuted(casinoAudio.toggleMute());

  // Initialize rotating coin frames in pixel art
  useEffect(() => {
    if (coinFramesRef.current.length > 0) return;

    const drawBlockyEllipse = (ctx, cx, cy, rx, ry, color) => {
      ctx.fillStyle = color;
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          if ((rx === 0 ? x === 0 : (x * x) / (rx * rx)) + (ry === 0 ? y === 0 : (y * y) / (ry * ry)) <= 1.05) {
            ctx.fillRect(cx + x, cy + y, 1, 1);
          }
        }
      }
    };

    const tempFrames = [];
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2;
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 16, 16);

      const cos = Math.cos(angle);
      const absCos = Math.abs(cos);
      const w = Math.max(1, Math.round(12 * absCos));

      // Outer rim
      const rxEdge = Math.round(6 * absCos);
      drawBlockyEllipse(ctx, 8, 8, rxEdge, 6, '#8a640f');
      // Coin face
      const rxFace = Math.round(4.5 * absCos);
      drawBlockyEllipse(ctx, 8, 8, rxFace, 4.5, '#e5a91a');
      // Highlight shine
      const rxShine = Math.round(2.5 * absCos);
      drawBlockyEllipse(ctx, 8, 8, rxShine, 2.5, '#f3d15c');

      // Center symbol/embossing detail
      if (w > 3) {
        ctx.fillStyle = '#8a640f';
        ctx.fillRect(8, 6, 1, 4);
      }

      tempFrames.push(canvas);
    }
    coinFramesRef.current = tempFrames;
  }, []);

  // Celebration particle canvas renderer
  useEffect(() => {
    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let isDestroyed = false;

    const renderLoop = () => {
      if (isDestroyed) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // CRITICAL: Disable smoothing for crisp retro pixel-art rendering!
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;

      const particles = celebrationParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx, coinFramesRef.current);
        if (!p.active) {
          particles.splice(i, 1);
        }
      }

      celebrationAnimRef.current = requestAnimationFrame(renderLoop);
    };

    celebrationAnimRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(celebrationAnimRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Global win animation function passed down to games
  const triggerWinAnimation = useCallback((amount) => {
    if (amount <= 0) return;
    setWinBanner({ amount });

    // Clear after 3.2 seconds
    setTimeout(() => {
      setWinBanner(cur => cur && cur.amount === amount ? null : cur);
    }, 3200);

    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Spawn 50 - 150 coins depending on payout size
    const count = Math.min(150, Math.max(50, Math.floor(amount / 4)));
    for (let i = 0; i < count; i++) {
      celebrationParticlesRef.current.push(new WinCoinParticle(w, h));
    }
  }, []);

  if (!user) return (
    <div className="page">
      <div className="empty" style={{ paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.2, fontFamily: 'Georgia' }}>♠</div>
        <p style={{ color: '#6a8fa8' }}>Iniciá sesión para jugar</p>
      </div>
    </div>
  );

  return (
    <div className="casino-shell" style={{ minHeight: 'calc(100vh - 70px)', position: 'relative' }}>
      {/* Celebration canvas */}
      <canvas ref={celebrationCanvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }} />

      {/* Win Banner Overlay */}
      {winBanner && (
        <div className="casino-win-banner-overlay" style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 99998,
          background: 'rgba(7, 7, 12, 0.45)', animation: 'winOverlayFadeIn 0.3s forwards',
        }}>
          <div className="win-banner-title" style={{
            fontFamily: 'Unbounded, system-ui', fontSize: '2.5rem', fontWeight: 800,
            color: '#f5c542', textShadow: '0 0 20px rgba(245,197,66,0.8), 0 0 45px rgba(255,45,122,0.6)',
            animation: 'winBannerPulse 0.4s infinite alternate ease-in-out',
            letterSpacing: '0.06em',
          }}>¡GANASTE!</div>
          <div className="win-banner-amount" style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '4rem', fontWeight: 950,
            color: '#6fff7d', textShadow: '0 0 15px rgba(111,255,125,0.8)', marginTop: 8,
          }}>
            +{winBanner.amount.toLocaleString('es-AR')} <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>TK</span>
          </div>
        </div>
      )}

      {/* ── GAME ACTIVE HEADER ─────────────────────────────── */}
      {activeGame && (
        <div className="casino-game-header" style={{ padding: '12px 24px 16px', borderBottom: '1px solid var(--c-line2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="casino-back-btn" onClick={() => setActiveGame(null)} style={{ height: 40 }}>
              ‹ Lobby
            </button>
            {activeGameDef && (
              <div style={{ marginLeft: 6 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui, sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
                  JUEGOS / {
                    activeGameDef.id === 'slots' ? 'TRAGAMONEDAS' :
                    activeGameDef.id === 'ruleta' ? 'RULETA' :
                    activeGameDef.id === 'poker' ? "TEXAS HOLD'EM" :
                    activeGameDef.id === 'blackjack' ? 'BLACKJACK' :
                    activeGameDef.id === 'plinko' ? 'PLINKO' :
                    activeGameDef.id === 'truco' ? 'TRUCO ARGENTINO' :
                    activeGameDef.id.toUpperCase()
                  }
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, lineHeight: 1.1 }}>
                  <span style={{ fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    {activeGameDef.name.split(' ')[0]}
                  </span>
                  {activeGameDef.name.split(' ').length > 1 && (
                    <span style={{ fontFamily: "'Unbounded', system-ui, sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#ff2d7a', letterSpacing: '-0.02em' }}>
                      {activeGameDef.name.split(' ').slice(1).join(' ')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--c-text3)', marginTop: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {activeGameDef.desc}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="casino-balance-badge" style={{ padding: '8px 16px', borderRadius: 10 }}>
              <span style={{ fontSize: 9, fontFamily: 'Unbounded,system-ui', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--c-text4)', textTransform: 'uppercase' }}>Balance</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 16, color: 'var(--c-accent2)', marginLeft: 6 }}>
                {balance.toLocaleString('es-AR')}
              </span>
              <span style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: 'Inter,sans-serif', marginLeft: 4 }}>TK</span>
              <button
                onClick={refreshBalance}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text4)', fontSize: '0.9rem', padding: 0, marginLeft: 8, lineHeight: 1, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--c-accent2)'}
                onMouseLeave={e => e.target.style.color = 'var(--c-text4)'}
              >↻</button>
            </div>
            <button className="casino-mute-btn" onClick={toggleMute} title={muted ? 'Activar sonido' : 'Silenciar'} style={{ width: 40, height: 40, borderRadius: 10 }}>
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
              <div style={{
                display: 'inline-flex', gap: 8, alignItems: 'center',
                fontFamily: 'Unbounded, system-ui', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--c-accent2)',
                marginBottom: 14,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-accent2)', boxShadow: '0 0 8px var(--c-accent2)' }} />
                Bono de bienvenida activo
              </div>
              <div className="casino-hero__title">
                Apuesta sin <span className="c-acc">gravedad</span>.
              </div>
              <p className="casino-hero__sub">
                9 juegos premium · RTP verificado y transparente · Bono multiplicador x3 activo en tu balance.
              </p>
              <div className="casino-hero__actions">
                <button
                  className="casino-hero-btn"
                  onClick={() => setActiveGame('ruleta')}
                >
                  Jugar ahora
                </button>
                <button
                  className="casino-back-btn"
                  style={{ height: 56, padding: '0 28px', borderRadius: 14, fontSize: 15, fontWeight: 700 }}
                  onClick={() => alert('Próximamente torneo semanal')}
                >
                  Ver torneos
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
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="casino-back-btn" style={{ padding: '4px 10px', height: 'auto', background: 'var(--c-surface2)', color: 'var(--c-text)' }}>Todos</button>
              <button className="casino-back-btn" style={{ padding: '4px 10px', height: 'auto' }}>Más jugados</button>
              <button className="casino-back-btn" style={{ padding: '4px 10px', height: 'auto' }}>Nuevos</button>
            </div>
          </div>
          <div className="casino-gcards">
            {GAMES.map(g => (
              <GameCard key={g.id} game={g} onClick={() => setActiveGame(g.id)} />
            ))}
          </div>

          {/* Recent Winners ticker */}
          <div className="casino-section-head" style={{ marginTop: 32 }}>
            <h2>Ganadores recientes <span className="c-acc">LIVE</span></h2>
          </div>
          <LiveWinsTicker />
        </div>
      )}

      {/* ── ACTIVE GAME ────────────────────────────────────── */}
      {activeGame && (
        <div className="casino-game-wrap">
          {activeGame === 'blackjack' && <Blackjack balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'ruleta'    && <CasinoRuleta balance={balance} onBalanceChange={setBalance} triggerWinAnimation={triggerWinAnimation} />}
          {activeGame === 'plinko'    && <Plinko balance={balance} onBalanceChange={setBalance} triggerWinAnimation={triggerWinAnimation} />}
          {activeGame === 'slots'     && <Slots balance={balance} onBalanceChange={setBalance} triggerWinAnimation={triggerWinAnimation} />}
          


          {activeGame === 'poker'     && <Poker user={user} balance={balance} onBalanceChange={setBalance} />}
          {activeGame === 'truco'     && <Truco user={user} balance={balance} />}
        </div>
      )}

      <style>{`
        @keyframes winOverlayFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(4px); }
        }
        @keyframes winBannerPulse {
          0% { transform: scale(0.94); }
          100% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
