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
    this.w = w; this.h = h;
    if (Math.random() > 0.4) {
      this.x = w / 2 + (Math.random() - 0.5) * 110;
      this.y = h + 10;
      this.vx = (Math.random() - 0.5) * 11;
      this.vy = -13 - Math.random() * 10;
    } else {
      this.x = Math.random() * w;
      this.y = -20;
      this.vx = (Math.random() - 0.5) * 3;
      this.vy = 2 + Math.random() * 4;
    }
    this.gravity = 0.45;
    this.frame = Math.floor(Math.random() * 8);
    this.frameSpeed = 0.14 + Math.random() * 0.1;
    this.size = (1.8 + Math.random() * 1.4) * 16; // pre-computed px size
    this.ttl = 100 + Math.floor(Math.random() * 50);
    this.age = 0;
    this.active = true;
  }
  update() {
    this.x += this.vx; this.vy += this.gravity; this.y += this.vy;
    this.frame = (this.frame + this.frameSpeed) % 8;
    this.age++;
    if (this.age >= this.ttl || this.y > this.h + 20) this.active = false;
  }
  get opacity() {
    if (this.age < 5) return this.age / 5;
    const fadeStart = this.ttl * 0.75;
    if (this.age > fadeStart) return 1 - (this.age - fadeStart) / (this.ttl - fadeStart);
    return 1;
  }
}

function fmtTokens(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString('es-AR');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function GameCard({ game, liveCount, onClick }) {
  return (
    <div className="casino-gcard" onClick={onClick}>
      <div className="casino-gcard__bg" style={{ background: game.bg }} />
      <div className="casino-gcard__art">{game.art}</div>
      {/* Live count — top left */}
      {liveCount > 0 && (
        <div className="casino-gcard__live">{liveCount.toLocaleString()}</div>
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseGameName(reason) {
  if (!reason) return 'Casino';
  if (reason.startsWith('Blackjack')) return 'Blackjack Pro';
  if (reason.startsWith('Plinko')) return 'Plinko Zero-G';
  if (reason.startsWith('Tragaperras')) return 'Anti-Gravity Slots';
  if (reason.startsWith('Ruleta')) return 'Ruleta Americana';
  return 'Casino';
}

function parseWin(row) {
  const { username, amount, reason } = row;
  let game = parseGameName(reason), bet = null, mult = null;

  if (reason) {
    if (reason.startsWith('Blackjack Split')) {
      const m = reason.match(/apuesta total:\s*(\d+)/i);
      if (m) { bet = parseInt(m[1]); mult = bet > 0 ? `${((bet + amount) / bet).toFixed(1)}x` : null; }
    } else if (reason.startsWith('Blackjack')) {
      const m = reason.match(/apuesta:\s*(\d+)/i);
      if (m) { bet = parseInt(m[1]); mult = bet > 0 ? `${((bet + amount) / bet).toFixed(1)}x` : null; }
    } else if (reason.startsWith('Plinko')) {
      const mm = reason.match(/\(x([\d.]+)\)/);
      if (mm) mult = `${mm[1]}x`;
      const mb = reason.match(/apuesta:\s*(\d+)/i);
      if (mb) bet = parseInt(mb[1]);
    } else if (reason.startsWith('Tragaperras')) {
      const mb = reason.match(/Apuesta:\s*(\d+)/);
      const mg = reason.match(/Ganancia:\s*(\d+)/);
      if (mb) bet = parseInt(mb[1]);
      if (mb && mg) mult = bet > 0 ? `${(parseInt(mg[1]) / bet).toFixed(1)}x` : null;
    }
  }
  return { user: username || 'anónimo', game, bet, win: amount, mult };
}

const GAME_FILTERS = [
  { id: 'all',       label: 'Todos' },
  { id: 'Blackjack Pro',       label: 'Blackjack' },
  { id: 'Plinko Zero-G',       label: 'Plinko' },
  { id: 'Anti-Gravity Slots',  label: 'Slots' },
  { id: 'Ruleta Americana',    label: 'Ruleta' },
];

function FilterChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
      background: active ? 'rgba(255,45,122,0.14)' : 'var(--c-surface3)',
      border: `1px solid ${active ? 'rgba(255,45,122,0.45)' : 'var(--c-line2)'}`,
      color: active ? 'var(--c-accent)' : 'var(--c-text3)',
      fontFamily: 'Inter, system-ui', fontWeight: 600, fontSize: '0.7rem',
      letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>{children}</button>
  );
}

const TH_STYLE = {
  padding: '10px 14px', fontFamily: 'Unbounded, system-ui', fontSize: '9px',
  fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-text4)',
};
const TD_MONO = { fontFamily: 'JetBrains Mono, monospace' };

function UserAvatar({ name }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-surface3)', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--c-text3)', flexShrink: 0 }}>
        {name[0].toUpperCase()}
      </span>
      {name}
    </span>
  );
}

function EmptyState({ msg }) {
  return <div style={{ padding: '28px', textAlign: 'center', color: 'var(--c-text3)', fontSize: 13 }}>{msg}</div>;
}

// ── Tab: Ganadores LIVE ───────────────────────────────────────────────────────

function WinnersTab({ gameFilter }) {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    api.casinoRecentWins()
      .then(data => { setWins(data.map(parseWin)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); const id = setInterval(fetch, 15000); return () => clearInterval(id); }, [fetch]);

  const rows = gameFilter === 'all' ? wins : wins.filter(w => w.game === gameFilter);

  if (loading) return <EmptyState msg="Cargando ganadores..." />;
  if (!rows.length) return <EmptyState msg={gameFilter === 'all' ? '¡Sé el primero en ganar!' : 'Sin ganadores en este juego aún.'} />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-line)' }}>
          {['Jugador', 'Juego', 'Apuesta', 'Multi', 'Ganancia'].map((h, i) => (
            <th key={i} style={{ ...TH_STYLE, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((w, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--c-line)' : 'none' }}>
            <td style={{ padding: '11px 14px', fontWeight: 600 }}><UserAvatar name={w.user} /></td>
            <td style={{ padding: '11px 14px', color: 'var(--c-text2)' }}>{w.game}</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', ...TD_MONO, color: 'var(--c-text3)' }}>{w.bet != null ? w.bet.toLocaleString() : '—'}</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', ...TD_MONO, fontWeight: 700, color: 'var(--c-accent)' }}>{w.mult || '—'}</td>
            <td style={{ padding: '11px 14px', textAlign: 'right', ...TD_MONO, fontWeight: 700, color: 'var(--c-accent2)' }}>+{w.win.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab: Mi Historial ─────────────────────────────────────────────────────────

function HistorialTab({ user, gameFilter, resultFilter }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.casinoHistory()
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) return <EmptyState msg="Iniciá sesión para ver tu historial de partidas." />;
  if (loading) return <EmptyState msg="Cargando historial..." />;

  const filtered = rows.filter(r => {
    const gMatch = gameFilter === 'all' || parseGameName(r.reason) === gameFilter;
    const rMatch = resultFilter === 'all' || (resultFilter === 'wins' ? r.amount > 0 : r.amount < 0);
    return gMatch && rMatch;
  });

  if (!filtered.length) return <EmptyState msg="Sin partidas con estos filtros." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-line)' }}>
          {['Juego', 'Detalle', 'Neto', 'Fecha'].map((h, i) => (
            <th key={i} style={{ ...TH_STYLE, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => {
          const isWin = r.amount > 0, isPush = r.amount === 0;
          const netColor = isWin ? 'var(--c-accent2)' : isPush ? 'var(--c-text3)' : '#ff6b6b';
          const date = new Date(r.created_at);
          const stamp = `${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
          return (
            <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--c-line)' : 'none' }}>
              <td style={{ padding: '10px 14px', color: 'var(--c-text2)', whiteSpace: 'nowrap' }}>{parseGameName(r.reason)}</td>
              <td style={{ padding: '10px 14px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--c-text3)', fontSize: 12 }}>{r.reason || '—'}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', ...TD_MONO, fontWeight: 700, color: netColor }}>{isWin ? '+' : ''}{r.amount.toLocaleString('es-AR')}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', ...TD_MONO, color: 'var(--c-text4)', fontSize: 11 }}>{stamp}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Tab: Mayores Pérdidas ─────────────────────────────────────────────────────

const LOSS_THRESHOLDS = [
  { value: 500,   label: '500+' },
  { value: 1000,  label: '1k+' },
  { value: 5000,  label: '5k+' },
  { value: 10000, label: '10k+' },
];

function LossesTab({ gameFilter, minLoss }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.casinoBiggestLosses()
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <EmptyState msg="Cargando pérdidas..." />;

  const filtered = rows.filter(r => {
    const gMatch = gameFilter === 'all' || parseGameName(r.reason) === gameFilter;
    return gMatch && Math.abs(r.amount) >= minLoss;
  });

  if (!filtered.length) return <EmptyState msg="Sin pérdidas que superen ese umbral." />;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-line)' }}>
          {['Jugador', 'Juego', 'Detalle', 'Pérdida', 'Fecha'].map((h, i) => (
            <th key={i} style={{ ...TH_STYLE, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => {
          const date = new Date(r.created_at);
          const stamp = `${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
          return (
            <tr key={i} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--c-line)' : 'none' }}>
              <td style={{ padding: '11px 14px', fontWeight: 600 }}><UserAvatar name={r.username || 'anónimo'} /></td>
              <td style={{ padding: '11px 14px', color: 'var(--c-text2)', whiteSpace: 'nowrap' }}>{parseGameName(r.reason)}</td>
              <td style={{ padding: '11px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--c-text3)', fontSize: 12 }}>{r.reason || '—'}</td>
              <td style={{ padding: '11px 14px', textAlign: 'right', ...TD_MONO, fontWeight: 700, color: '#ff6b6b' }}>{r.amount.toLocaleString('es-AR')}</td>
              <td style={{ padding: '11px 14px', textAlign: 'right', ...TD_MONO, color: 'var(--c-text4)', fontSize: 11 }}>{stamp}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Stats Panel (tabbed) ──────────────────────────────────────────────────────

const TABS = [
  { id: 'ganadores', label: '● Ganadores LIVE' },
  { id: 'historial', label: 'Mi Historial' },
  { id: 'perdidas',  label: 'Mayores Pérdidas' },
];

function StatsPanel({ user }) {
  const [tab, setTab] = useState('ganadores');
  const [gameFilter, setGameFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [minLoss, setMinLoss] = useState(1000);

  const handleTab = (id) => { setTab(id); setGameFilter('all'); setResultFilter('all'); };

  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line2)', borderRadius: 14, overflow: 'hidden', marginTop: 32 }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--c-line)', background: 'var(--c-surface2)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTab(t.id)} style={{
            padding: '13px 18px',
            background: 'none',
            border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--c-accent)' : '2px solid transparent',
            color: tab === t.id ? 'var(--c-accent)' : 'var(--c-text3)',
            fontFamily: 'Unbounded, system-ui',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--c-line)', background: 'var(--c-bg1)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--c-text4)', fontFamily: 'Unbounded, system-ui', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 4 }}>Juego</span>
        {GAME_FILTERS.map(f => (
          <FilterChip key={f.id} active={gameFilter === f.id} onClick={() => setGameFilter(f.id)}>{f.label}</FilterChip>
        ))}

        {tab === 'historial' && (
          <>
            <span style={{ width: 1, height: 18, background: 'var(--c-line2)', margin: '0 4px' }} />
            {[{ id: 'all', label: 'Todos' }, { id: 'wins', label: 'Ganancias' }, { id: 'losses', label: 'Pérdidas' }].map(f => (
              <FilterChip key={f.id} active={resultFilter === f.id} onClick={() => setResultFilter(f.id)}>{f.label}</FilterChip>
            ))}
          </>
        )}

        {tab === 'perdidas' && (
          <>
            <span style={{ width: 1, height: 18, background: 'var(--c-line2)', margin: '0 4px' }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--c-text4)', fontFamily: 'Unbounded, system-ui', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mínimo</span>
            {LOSS_THRESHOLDS.map(t => (
              <FilterChip key={t.value} active={minLoss === t.value} onClick={() => setMinLoss(t.value)}>{t.label}</FilterChip>
            ))}
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ overflowX: 'auto' }}>
        {tab === 'ganadores' && <WinnersTab gameFilter={gameFilter} />}
        {tab === 'historial' && <HistorialTab user={user} gameFilter={gameFilter} resultFilter={resultFilter} />}
        {tab === 'perdidas'  && <LossesTab gameFilter={gameFilter} minLoss={minLoss} />}
      </div>
    </div>
  );
}

export default function Casino() {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [balance, setBalance] = useState(user?.coins || 0);
  const [muted, setMuted] = useState(casinoAudio.muted);
  const [winBanner, setWinBanner] = useState(null);
  const [stats, setStats] = useState(null);

  const celebrationCanvasRef = useRef(null);
  const celebrationParticlesRef = useRef([]);
  const celebrationAnimRef = useRef(null);
  const coinFramesRef = useRef([]);
  const renderLoopRef = useRef(null);

  useEffect(() => { setBalance(user?.coins || 0); }, [user]);

  useEffect(() => {
    const fetch = () => api.casinoStats().then(setStats).catch(() => {});
    fetch();
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, []);

  const refreshBalance = useCallback(() => {
    api.me && api.me().then(u => setBalance(u.coins)).catch(() => {});
  }, []);

  const activeGameDef = GAMES.find(g => g.id === activeGame);
  const toggleMute = () => setMuted(casinoAudio.toggleMute());

  // Initialize rotating coin frames in pixel art
  // Pre-render coin sprite frames once (8 rotation angles, 16×16 px each)
  useEffect(() => {
    if (coinFramesRef.current.length > 0) return;
    const drawEllipse = (ctx, cx, cy, rx, ry, color) => {
      ctx.fillStyle = color;
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          const inX = rx === 0 ? x === 0 : (x * x) / (rx * rx);
          const inY = ry === 0 ? y === 0 : (y * y) / (ry * ry);
          if (inX + inY <= 1.05) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    };
    coinFramesRef.current = Array.from({ length: 8 }, (_, f) => {
      const angle = (f / 8) * Math.PI * 2;
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const ctx = c.getContext('2d');
      const cos = Math.abs(Math.cos(angle));
      drawEllipse(ctx, 8, 8, Math.round(6 * cos), 6, '#8a640f');
      drawEllipse(ctx, 8, 8, Math.round(4.5 * cos), 4.5, '#e5a91a');
      drawEllipse(ctx, 8, 8, Math.round(2.5 * cos), 2.5, '#f3d15c');
      if (cos > 0.25) { ctx.fillStyle = '#8a640f'; ctx.fillRect(8, 6, 1, 4); }
      return c;
    });
  }, []);

  // Canvas resize — runs once, no RAF loop started here
  useEffect(() => {
    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(celebrationAnimRef.current);
      celebrationAnimRef.current = null;
    };
  }, []);

  // Render loop stored in a ref so triggerWinAnimation can start it on demand
  renderLoopRef.current = () => {
    const canvas = celebrationCanvasRef.current;
    if (!canvas) { celebrationAnimRef.current = null; return; }
    const particles = celebrationParticlesRef.current;

    // Self-terminate when all particles are gone
    if (particles.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      celebrationAnimRef.current = null;
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const frames = coinFramesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (!p.active) { particles.splice(i, 1); continue; }
      const img = frames[Math.floor(p.frame)];
      if (!img) continue;
      ctx.globalAlpha = p.opacity;
      ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    celebrationAnimRef.current = requestAnimationFrame(renderLoopRef.current);
  };

  const triggerWinAnimation = useCallback((amount) => {
    if (amount <= 0) return;
    setWinBanner({ amount });
    setTimeout(() => setWinBanner(cur => cur?.amount === amount ? null : cur), 3200);

    const canvas = celebrationCanvasRef.current;
    if (!canvas) return;

    // 20–45 particles — enough for the visual, light on the GPU
    const count = Math.min(45, Math.max(20, Math.floor(amount / 800)));
    const { width: w, height: h } = canvas;
    for (let i = 0; i < count; i++) {
      celebrationParticlesRef.current.push(new WinCoinParticle(w, h));
    }

    // Start the RAF loop only if it isn't already running
    if (!celebrationAnimRef.current) {
      celebrationAnimRef.current = requestAnimationFrame(renderLoopRef.current);
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
              <span className="casino-stat-val">{stats ? stats.activePlayers.toLocaleString('es-AR') : '—'}</span>
              <span className="casino-stat-delta">últimos 15 min</span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">Pagado 24h</span>
              <span className="casino-stat-val" style={{ color: 'var(--c-accent2)' }}>{stats ? fmtTokens(stats.paid24h) : '—'}</span>
              <span className="casino-stat-delta">
                {stats?.paidDelta != null ? `${stats.paidDelta > 0 ? '+' : ''}${stats.paidDelta}% vs ayer` : 'tokens'}
              </span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">RTP promedio</span>
              <span className="casino-stat-val">{stats?.rtp != null ? `${stats.rtp}%` : '—'}</span>
              <span className="casino-stat-delta">últimas 500 rondas</span>
            </div>
            <div className="casino-stat-cell">
              <span className="casino-stat-label">Big win</span>
              <span className="casino-stat-val" style={{ color: 'var(--c-accent)' }}>
                {stats?.bigWin ? fmtTokens(stats.bigWin.amount) : '—'}
              </span>
              <span className="casino-stat-delta">{stats?.bigWin ? timeAgo(stats.bigWin.createdAt) : ''}</span>
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
              <GameCard
                key={g.id}
                game={g}
                liveCount={stats?.liveByGame?.[g.id] ?? 0}
                onClick={() => setActiveGame(g.id)}
              />
            ))}
          </div>

          {/* Stats panel — tabbed */}
          <StatsPanel user={user} />

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
