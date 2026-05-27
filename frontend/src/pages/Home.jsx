import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

function formatDate(str) {
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNum(n) {
  if (!n && n !== 0) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtFame(n) {
  if (!n) return '0';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function CategoryBadge({ cat }) {
  const map = { announcement: { label: 'Anuncio', cls: 'badge-officer' }, general: { label: 'General', cls: 'badge-member' }, event: { label: 'Evento', cls: 'badge-pvp' }, war: { label: 'Guerra', cls: 'badge-cta' } };
  const c = map[cat] || { label: cat, cls: 'badge-member' };
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

function VerifyPlayer() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.checkPlayer(search.trim());
      setResult({ ...data, searched: search.trim() });
    } catch { setResult({ error: true }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.2em', color: '#00d4ff', textTransform: 'uppercase', marginBottom: 10 }}>
          ⚔️ Verifica Jugador
        </div>
        <form onSubmit={handleCheck} style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={search} onChange={e => { setSearch(e.target.value); setResult(null); }} placeholder="Nombre del jugador en Albion..." style={{ flex: 1, fontSize: '1rem' }} />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>{loading ? '...' : 'Verificar'}</button>
        </form>
      </div>
      {result && !result.error && (
        <div style={{ padding: '18px 24px', borderRadius: 10, border: `2px solid ${result.blacklisted ? '#ff3355' : '#00cc66'}`, background: result.blacklisted ? 'rgba(255,51,85,0.08)' : 'rgba(0,204,102,0.08)', boxShadow: `0 0 25px ${result.blacklisted ? 'rgba(255,51,85,0.2)' : 'rgba(0,204,102,0.2)'}`, textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>{result.blacklisted ? '🚫' : '✅'}</div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.1em', color: result.blacklisted ? '#ff3355' : '#00cc66' }}>
            {result.blacklisted ? 'JUGADOR EN BLACKLIST' : 'JUGADOR ACEPTADO'}
          </div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', color: '#9090b0', marginTop: 4 }}>{result.searched}</div>
          {result.blacklisted && result.reason && (
            <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(255,51,85,0.1)', borderRadius: 6, fontSize: '0.88rem', color: '#ff8899' }}>Motivo: {result.reason}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── GIVEAWAY WIDGET ── */
function GiveawayWidget() {
  const { user, isAdmin } = useAuth();
  const [giveaway, setGiveaway] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [joined, setJoined] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [spinNames, setSpinNames] = useState([]);
  const spinRef = useRef(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', prizes: '', duration: 60 });
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const g = await api.getCurrentGiveaway();
      setGiveaway(g);
      if (g && user) setJoined((g.participants || []).some(p => p.id === user.id));
      if (g?.status === 'finished' && !revealed) {
        setRevealed(true);
        setSpinning(false);
      }
    } catch {}
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!giveaway) return;
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, [giveaway?.id, giveaway?.status]);

  useEffect(() => {
    if (!giveaway?.ends_at || giveaway.status !== 'active') return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(giveaway.ends_at) - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [giveaway?.ends_at, giveaway?.status]);

  // Trigger spin animation when near end
  useEffect(() => {
    if (!giveaway || giveaway.status !== 'active') return;
    if (timeLeft <= 5 && timeLeft > 0 && !spinning && (giveaway.participants || []).length > 0) {
      setSpinning(true);
      const names = (giveaway.participants || []).map(p => p.username);
      setSpinNames(names);
    }
    if (timeLeft === 0) setSpinning(false);
  }, [timeLeft, giveaway?.status]);

  const handleJoin = async () => {
    if (!giveaway) return;
    try { await api.joinGiveaway(giveaway.id); setJoined(true); load(); }
    catch (e) { alert(e.message); }
  };

  const handleClose = async () => {
    if (!giveaway) return;
    try { await api.closeGiveaway(giveaway.id); setGiveaway(null); }
    catch (e) { alert(e.message); }
  };

  const handleCancel = async () => {
    if (!giveaway || !confirm('¿Cancelar este sorteo?')) return;
    try { await api.cancelGiveaway(giveaway.id); setGiveaway(null); }
    catch (e) { alert(e.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setCreateErr('');
    try {
      const prizes = createForm.prizes.split(',').map(p => p.trim()).filter(Boolean);
      if (!prizes.length) { setCreateErr('Ingresá al menos un premio'); setCreating(false); return; }
      await api.createGiveaway({ title: createForm.title, prizes, duration: parseInt(createForm.duration) || 60 });
      setShowCreateForm(false);
      setCreateForm({ title: '', prizes: '', duration: 60 });
      load();
    } catch (e) { setCreateErr(e.message); }
    finally { setCreating(false); }
  };

  if (!giveaway) {
    if (!user) return null;
    return (
      <div className="card" style={{ border: '1px solid #1e1e30' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#6a6a8a', letterSpacing: '0.08em' }}>🎰 Sin sorteos activos</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(o => !o)}>
            {showCreateForm ? '✕ Cancelar' : '＋ Crear Sorteo'}
          </button>
        </div>
        {showCreateForm && (
          <form onSubmit={handleCreate} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {createErr && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{createErr}</div>}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Título del sorteo</label>
              <input className="input" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Sorteo de Silver Semanal" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Premios (separados por coma)</label>
              <input className="input" value={createForm.prizes} onChange={e => setCreateForm(p => ({ ...p, prizes: e.target.value }))} placeholder="Ej: 5M silver, 3M silver, 1M silver" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Duración (segundos)</label>
              <input className="input" type="number" min="10" value={createForm.duration} onChange={e => setCreateForm(p => ({ ...p, duration: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creando...' : '🎰 Crear Sorteo'}</button>
          </form>
        )}
      </div>
    );
  }

  const participants = giveaway.participants || [];
  const winners = giveaway.winners || [];

  const fmtTime = s => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const isActive = giveaway.status === 'active';
  const isWaiting = giveaway.status === 'waiting';
  const isFinished = giveaway.status === 'finished';

  return (
    <div className="card" style={{ border: '2px solid rgba(0,212,255,0.3)', background: 'linear-gradient(135deg, #0a0a18, #0f0f22)', position: 'relative', overflow: 'hidden' }}>
      {/* Glow bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: '#00d4ff', letterSpacing: '0.08em' }}>
            🎰 SORTEO — {giveaway.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, fontFamily: 'Rajdhani', fontWeight: 700,
              background: isActive ? 'rgba(0,204,102,0.15)' : isWaiting ? 'rgba(255,170,0,0.15)' : 'rgba(0,212,255,0.1)',
              color: isActive ? '#00cc66' : isWaiting ? '#ffaa00' : '#00d4ff',
              border: `1px solid ${isActive ? '#00cc6644' : isWaiting ? '#ffaa0044' : '#00d4ff44'}` }}>
              {isActive ? '🔴 EN VIVO' : isWaiting ? '⏳ PRÓXIMO' : '🏆 FINALIZADO'}
            </span>
            {isFinished && user && (isAdmin || giveaway.created_by === user.id) && (
              <button onClick={handleClose} style={{ background: 'rgba(255,51,85,0.15)', border: '1px solid rgba(255,51,85,0.4)', color: '#ff6688', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontFamily: 'Rajdhani', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
                ✕ Cerrar
              </button>
            )}
            {(isActive || isWaiting) && user && (isAdmin || giveaway.created_by === user.id) && (
              <button onClick={handleCancel} style={{ background: 'rgba(255,51,85,0.15)', border: '1px solid rgba(255,51,85,0.4)', color: '#ff6688', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontFamily: 'Rajdhani', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
                🗑 Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Prizes */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {giveaway.prizes.map((p, i) => (
            <div key={i} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '6px 14px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: '#ffd700' }}>
              🏆 {i + 1}° — {p}
            </div>
          ))}
        </div>

        {/* Countdown */}
        {isActive && (
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '3rem', color: timeLeft <= 10 ? '#ff3355' : '#00d4ff', letterSpacing: '0.1em', lineHeight: 1, transition: 'color 0.3s' }}>
              {fmtTime(timeLeft)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tiempo restante</div>
          </div>
        )}

        {/* Spin animation */}
        {spinning && spinNames.length > 0 && (
          <div style={{ textAlign: 'center', margin: '10px 0', overflow: 'hidden', height: 40 }}>
            <div style={{ animation: 'spinNames 0.15s linear infinite', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: '#ffd700' }}>
              {spinNames[Math.floor(Date.now() / 150) % spinNames.length]}
            </div>
            <style>{`@keyframes spinNames { 0%{opacity:0;transform:translateY(-10px)} 50%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(10px)} }`}</style>
          </div>
        )}

        {/* Winners */}
        {isFinished && winners.length > 0 && (
          <div style={{ margin: '12px 0', padding: '14px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ffd700', marginBottom: 10, textAlign: 'center', letterSpacing: '0.1em' }}>🎉 GANADORES</div>
            {winners.map((w, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < winners.length - 1 ? '1px solid rgba(255,215,0,0.1)' : 'none' }}>
                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {w.username}</span>
                <span style={{ fontSize: '0.85rem', color: '#ffd700', fontFamily: 'Rajdhani' }}>{w.prize}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats + Join */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: '0.85rem', color: '#6a6a8a' }}>
            👥 <strong style={{ color: '#9090b0' }}>{participants.length}</strong> inscriptos
            {giveaway.prizes.length > 1 && <span style={{ marginLeft: 8 }}>· {giveaway.prizes.length} premios</span>}
          </div>
          {(isActive || isWaiting) && user && !joined && (
            <button className="btn btn-primary btn-sm" onClick={handleJoin} style={{ background: 'linear-gradient(135deg, #00aa44, #006622)', borderColor: '#00cc66' }}>
              🎰 Participar
            </button>
          )}
          {joined && (isActive || isWaiting) && (
            <span style={{ fontSize: '0.82rem', color: '#00cc66', fontFamily: 'Rajdhani', fontWeight: 700 }}>✅ Inscripto</span>
          )}
          {(isActive || isWaiting) && !user && (
            <Link to="/login" className="btn btn-secondary btn-sm">Iniciar sesión para participar</Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ALBION RANKINGS SIDEBAR ── */
const SIDEBAR_TABS = [
  { key: 'pvp',       label: '⚔️ PvP',    dataKey: 'byKillFame',  statKey: 'killFame',  color: '#ff4466' },
  { key: 'pve',       label: '🐉 PvE',    dataKey: 'byPve',       statKey: 'pve',       color: '#a78bfa' },
  { key: 'gathering', label: '⛏️ Recol.', dataKey: 'byGathering', statKey: 'gathering', color: '#00e8c0' },
  { key: 'crafting',  label: '🔨 Craft',  dataKey: 'byCrafting',  statKey: 'crafting',  color: '#ffd700' },
];

function AlbionRankingsSidebar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pvp');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.getAlbionStats().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const tab = SIDEBAR_TABS.find(t => t.key === activeTab);

  const handleTabChange = (key) => { setActiveTab(key); setExpanded(false); };

  return (
    <div className="card">
      <div className="card-title">🏆 Rankings en Vivo</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {SIDEBAR_TABS.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
            padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem',
            border: `1px solid ${activeTab === t.key ? t.color + '66' : '#1e1e30'}`,
            background: activeTab === t.key ? t.color + '18' : 'transparent',
            color: activeTab === t.key ? t.color : '#6a6a8a',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#4a4a6a', fontSize: '0.82rem', padding: '8px 0' }}>Cargando stats...</div>}

      {data && (() => {
        const full = data[tab.dataKey] || [];
        const list = expanded ? full : full.slice(0, 10);
        const maxVal = full[0]?.[tab.statKey] || 1;
        return (
          <>
            {list.length === 0
              ? <div style={{ color: '#4a4a6a', fontSize: '0.82rem' }}>Sin datos</div>
              : list.map((p, i) => {
                  const pct = (p[tab.statKey] / maxVal) * 100;
                  const top3 = i < 3;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: top3 ? '1.05rem' : '0.88rem', width: 26, textAlign: 'center', color: top3 ? undefined : '#5a5a7a', flexShrink: 0 }}>
                        {top3 ? medals[i] : '#' + (i + 1)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.88rem', color: top3 ? '#e0e0f0' : '#a0a0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ height: 3, background: '#1a1a28', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: tab.color, borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: tab.color, fontFamily: 'Rajdhani', fontWeight: 700, flexShrink: 0, minWidth: 52, textAlign: 'right' }}>
                        {fmtFame(p[tab.statKey])}
                      </span>
                    </div>
                  );
                })
            }
            {full.length > 10 && (
              <button onClick={() => setExpanded(e => !e)} style={{
                width: '100%', marginTop: 12, padding: '7px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e30',
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem',
                color: '#6a6a8a', letterSpacing: '0.05em', transition: 'all 0.15s',
              }}>
                {expanded ? '▲ Ver menos' : `▼ Ver todos (${full.length})`}
              </button>
            )}
          </>
        );
      })()}

      {data?.fetchedAt && (
        <div style={{ fontSize: '0.68rem', color: '#3a3a5a', textAlign: 'right', marginTop: 10 }}>
          ↻ {new Date(data.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

/* ── BANNER SLIDESHOW ── */
function BannerSlideshow({ slides, idx, visible, slideVisible }) {
  if (!slides.length) return null;
  const slide = slides[idx % slides.length];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10, border: '1px solid rgba(0,212,255,0.15)' }}>
      <div style={{ transition: 'opacity 0.8s ease-in-out', opacity: visible ? 1 : 0, height: '100%' }}>
        <img src={slide.url} alt={slide.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#08080e', transition: 'transform 8s ease-out', transform: slideVisible ? 'scale(1)' : 'scale(1.04)' }} />
        {slide.caption && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem', color: 'white', letterSpacing: '0.05em', textAlign: 'center' }}>{slide.caption}</div>
          </div>
        )}
      </div>
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
          {slides.map((_, i) => (
            <div key={i} style={{ width: i === idx % slides.length ? 14 : 6, height: 6, borderRadius: 3, background: i === idx % slides.length ? '#00d4ff' : 'rgba(255,255,255,0.3)', transition: 'all 0.5s' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function UtcClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  const date = now.toLocaleDateString('es-ES', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <div className="card stat-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stat-value" style={{ fontSize: '1.6rem', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <div className="stat-label">UTC — {date}</div>
    </div>
  );
}

export default function Home() {
  const [news, setNews] = useState([]);
  const [rankings, setRankings] = useState(null);
  const [weeklyPrize, setWeeklyPrize] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideVisible, setSlideVisible] = useState(true);
  const [seenNews, setSeenNews] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seen_news') || '[]')); }
    catch { return new Set(); }
  });

  const markSeen = (id) => {
    setSeenNews(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('seen_news', JSON.stringify([...next]));
      return next;
    });
  };

  const isNew = (post) => {
    if (seenNews.has(post.id)) return false;
    const age = Date.now() - new Date(post.created_at).getTime();
    return age < 48 * 60 * 60 * 1000; // 48 horas
  };

  useEffect(() => {
    Promise.all([api.getNews(), api.getRankings(), api.getWeeklyPrize(), api.getBanners()])
      .then(([n, r, wp, b]) => { setNews(n); setRankings(r); setWeeklyPrize(wp); setBanners(Array.isArray(b) ? b : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const iv = setInterval(() => {
      setSlideVisible(false);
      setTimeout(() => { setSlideIdx(i => (i + 1) % banners.length); setSlideVisible(true); }, 900);
    }, 8000);
    return () => clearInterval(iv);
  }, [banners.length]);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(to bottom, #0a0a12, #08080e)', borderBottom: '1px solid #1e1e30', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className={banners.length > 0 ? 'hero-layout' : ''} style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', padding: '40px 20px' }}>

          {/* Left slideshow */}
          {banners.length > 0 && (
            <div style={{ height: 320 }} className="hero-slideshow">
              <BannerSlideshow slides={banners} idx={slideIdx} visible={slideVisible} slideVisible={slideVisible} />
            </div>
          )}

          {/* Center hero */}
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 500, margin: '0 auto' }}>
              <img src="/logo-banner.png" alt="ANT1GRAVITY" style={{ width: '100%', display: 'block', WebkitMaskImage: 'radial-gradient(ellipse 65% 60% at 50% 50%, black 25%, transparent 75%)', maskImage: 'radial-gradient(ellipse 65% 60% at 50% 50%, black 25%, transparent 75%)', mixBlendMode: 'luminosity', filter: 'drop-shadow(0 0 25px rgba(0,212,255,0.4)) brightness(1.05)' }}
                onError={e => { e.target.parentElement.style.display = 'none'; document.getElementById('hero-text').style.display = 'block'; }} />
            </div>
            <div id="hero-text" style={{ display: 'none', fontFamily: 'Rajdhani', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 700, color: 'white', letterSpacing: '0.12em', lineHeight: 1, textShadow: '0 0 40px rgba(0,212,255,0.3)' }}>
              ANT<span style={{ color: '#00d4ff', textShadow: '0 0 30px #00d4ff, 0 0 60px rgba(0,212,255,0.4)' }}>1</span>GRAVITY
            </div>
            <p style={{ color: '#6a6a8a', marginTop: 8, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'Rajdhani' }}>Albion Online</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <Link to="/members" className="btn btn-primary">Ver Miembros</Link>
              <Link to="/builds" className="btn btn-secondary">Builds</Link>
            </div>
            <VerifyPlayer />
          </div>

          {/* Right slideshow — offset by half so it's always a different photo */}
          {banners.length > 0 && (
            <div style={{ height: 320 }} className="hero-slideshow">
              <BannerSlideshow slides={banners} idx={(slideIdx + Math.max(1, Math.floor(banners.length / 2))) % banners.length} visible={slideVisible} slideVisible={slideVisible} />
            </div>
          )}
        </div>
      </div>

      <div className="page">
        {/* Quick stats */}
        <div className="stats-bar">
          <div className="card stat-box">
            <div className="stat-value">{rankings?.total ?? '—'}</div>
            <div className="stat-label">Miembros</div>
          </div>
          <UtcClock />
        </div>

        <div className="home-grid">
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Giveaway */}
            <GiveawayWidget />

            {/* News */}
            <div>
              <div className="section-header"><h2>Novedades</h2><div className="accent-line" /></div>
              {news.length === 0 && <div className="empty"><div className="empty-icon">📰</div><p>Sin novedades aún</p></div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {news.map(post => {
                  const nuevo = isNew(post);
                  return (
                    <div key={post.id} className={`card news-card${nuevo ? ' news-card-new' : ''}`}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {post.pinned === 1 && <span className="pinned-badge">📌 Fijado</span>}
                        {nuevo && <span className="new-badge">✨ NUEVO</span>}
                        <CategoryBadge cat={post.category} />
                        <h3 style={{ fontFamily: 'Rajdhani', fontSize: '1.2rem', fontWeight: 700, color: 'white', flex: 1 }}>{post.title}</h3>
                      </div>
                      {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 6 }} />}
                      <p className="news-content">{post.content}</p>
                      <div className="news-meta" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span>✍️ {post.author_name}</span>
                          <span>📅 {formatDate(post.created_at)}</span>
                        </div>
                        {nuevo && (
                          <button onClick={() => markSeen(post.id)} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.35)', color: '#ffd700', borderRadius: 6, padding: '3px 12px', fontSize: '0.78rem', fontFamily: 'Rajdhani', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
                            ✓ Visto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly prize photo */}
            {weeklyPrize?.url && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: 'rgba(0,212,255,0.05)', borderBottom: '1px solid #1e1e30' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#00d4ff', letterSpacing: '0.08em' }}>🎁 PREMIOS SEMANALES</div>
                </div>
                <img src={weeklyPrize.url} alt="Premios semanales" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AlbionRankingsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
