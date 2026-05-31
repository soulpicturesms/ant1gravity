import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function mkRand(seed) {
  let s = ((seed ^ 0x89abcdef) >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function adjColor(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const RACE_MS = 13000;
const R       = 15;
const LANE_H  = 52;
const NAME_W  = 152;
const R_PAD   = 88;
const TOP_PAD = 44;

function buildMarbles(participants, seedStr, winnerName) {
  const rand = mkRand(parseInt(seedStr) || 1);
  return participants.map(p => ({
    ...p,
    isWinner: p.name === winnerName,
    finalFrac: p.name === winnerName ? 1.0 : 0.38 + rand() * 0.52,
    wAmp:   3 + rand() * 6,
    wFreq:  0.002 + rand() * 0.005,
    wPhase: rand() * Math.PI * 2,
  }));
}

function drawScene(canvas, marbles, elapsed) {
  if (!canvas || !marbles.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const trackW = W - NAME_W - R_PAD;
  const finX = NAME_W + trackW;
  const prog = Math.min(elapsed / RACE_MS, 1);

  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, 0, W, H);

  // Lanes
  marbles.forEach((m, i) => {
    const ly = TOP_PAD + i * LANE_H + LANE_H / 2;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.022)' : 'rgba(255,255,255,0.012)';
    ctx.fillRect(0, ly - LANE_H / 2, W, LANE_H);
    ctx.save();
    ctx.setLineDash([5, 9]);
    ctx.strokeStyle = m.color + '22';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(NAME_W, ly); ctx.lineTo(finX, ly); ctx.stroke();
    ctx.restore();
  });

  // Name column bg
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(0, 0, NAME_W, H);

  // Finish line (pulsing)
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.004);
  ctx.strokeStyle = `rgba(255,215,0,${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(finX, TOP_PAD - 12); ctx.lineTo(finX, H - 10); ctx.stroke();
  // Checkered pattern
  const sq = 8;
  for (let row = 0; row < Math.floor((H - TOP_PAD + 8) / sq); row++) {
    for (let col = 0; col < 2; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = `rgba(255,215,0,${0.18 + pulse * 0.22})`;
        ctx.fillRect(finX + col * sq - sq, TOP_PAD - 8 + row * sq, sq, sq);
      }
    }
  }
  ctx.font = 'bold 9px Rajdhani,sans-serif';
  ctx.fillStyle = `rgba(255,215,0,${0.6 + pulse * 0.4})`;
  ctx.textAlign = 'center';
  ctx.fillText('FINISH', finX, TOP_PAD - 16);

  // Marbles
  marbles.forEach((m, i) => {
    const ly = TOP_PAD + i * LANE_H + LANE_H / 2;
    const xFrac = smooth(prog) * m.finalFrac;
    const wobble = m.wAmp * Math.sin(elapsed * m.wFreq + m.wPhase) * Math.min(elapsed / 1200, 1);
    const mx = NAME_W + xFrac * trackW;
    const my = ly + wobble;

    // Trail (speed-proportional)
    const tInt = smooth(prog) * (1 - smooth(prog)) * 3.8;
    if (tInt > 0.04) {
      for (let t = 1; t <= 5; t++) {
        const tx = mx - t * R * 1.8;
        if (tx < NAME_W) continue;
        const a = (1 - t / 6) * tInt * 0.6;
        ctx.beginPath(); ctx.arc(tx, my, R * (1 - t * 0.1), 0, Math.PI * 2);
        ctx.fillStyle = m.color + Math.round(Math.max(0, a) * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }

    // Glow
    const glow = ctx.createRadialGradient(mx, my, 0, mx, my, R * 2.8);
    glow.addColorStop(0, m.color + '55'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(mx, my, R * 2.8, 0, Math.PI * 2); ctx.fill();

    // Marble body
    const mg = ctx.createRadialGradient(mx - R * .3, my - R * .3, 1, mx, my, R);
    mg.addColorStop(0, '#fff'); mg.addColorStop(0.25, m.color); mg.addColorStop(1, adjColor(m.color, -80));
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2); ctx.fill();

    // Crown when winner crosses
    if (m.isWinner && xFrac >= 0.99) {
      ctx.font = '16px serif'; ctx.textAlign = 'center';
      ctx.fillText('👑', mx, my - R - 5);
    }

    // Name in left column
    const label = m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name;
    ctx.textAlign = 'left';
    ctx.font = `bold 12px Rajdhani,sans-serif`;
    ctx.fillStyle = m.isWinner ? '#ffd700' : '#cccccc';
    ctx.fillText(label, 8, ly + 5);

    // Color dot
    ctx.beginPath(); ctx.arc(NAME_W - 10, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.color; ctx.fill();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Marble() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'officer';

  const canvasRef    = useRef();
  const animRef      = useRef();
  const startRef     = useRef(null);
  const marbleRef    = useRef([]);
  const celebRef     = useRef(false);
  const particlesRef = useRef([]);
  const prevStatus   = useRef(null);

  const [session, setSession] = useState(null);
  const [name, setName]       = useState('');
  const [joined, setJoined]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase]     = useState('idle');
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  const notify = (ok, t) => { if (ok) setMsg(t); else setErr(t); setTimeout(() => { setMsg(''); setErr(''); }, 4000); };
  const stopAnim = () => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; } };

  const spawnParticles = (x, y, color) => {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 9;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3.5,
        r: 2 + Math.random() * 5,
        color: [color, '#ffd700', '#ffffff'][i % 3],
        life: 1,
      });
    }
  };

  const startRace = useCallback((data, srvElapsed = 0) => {
    stopAnim();
    celebRef.current = false;
    particlesRef.current = [];
    startRef.current = performance.now() - Math.max(0, srvElapsed);
    marbleRef.current = buildMarbles(data.participants, data.seed, data.winner_name);

    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      drawScene(canvas, marbleRef.current, elapsed);

      // Particles on top
      const ctx = canvas.getContext('2d');
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.018;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // Winner check
      const prog = Math.min(elapsed / RACE_MS, 1);
      const winner = marbleRef.current.find(m => m.isWinner);
      if (winner && smooth(prog) * winner.finalFrac >= 0.99 && !celebRef.current) {
        celebRef.current = true;
        const W = canvas.width, trackW = W - NAME_W - R_PAD, finX = NAME_W + trackW;
        const wi = marbleRef.current.findIndex(m => m.isWinner);
        spawnParticles(finX, TOP_PAD + wi * LANE_H + LANE_H / 2, winner.color);
        setTimeout(() => setPhase('done'), 2000);
      }

      if (elapsed < RACE_MS + 6000) animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getMarbleSession();
      setSession(data);

      if (data.status === 'racing' && prevStatus.current !== 'racing') {
        const srv = data.started_at ? Date.now() - new Date(data.started_at).getTime() : 0;
        setPhase('racing');
        startRace(data, srv);
      } else if (data.status === 'waiting') {
        stopAnim(); startRef.current = null; setPhase('idle');
        setTimeout(() => drawScene(canvasRef.current, buildMarbles(data.participants || [], 0, null), 0), 60);
      } else if (['none', 'finished', 'cancelled'].includes(data.status)) {
        stopAnim(); setPhase('idle');
      }
      prevStatus.current = data.status;
    } catch {}
  }, [startRace]);

  useEffect(() => {
    fetchSession();
    const iv = setInterval(fetchSession, 3000);
    return () => { clearInterval(iv); stopAnim(); };
  }, [fetchSession]);

  const join = async () => {
    if (!name.trim()) return notify(false, 'Ingresá tu nombre');
    setLoading(true);
    try {
      await api.joinMarble(name.trim());
      setJoined(true);
      notify(true, `¡${name} inscripto! 🎉`);
      await fetchSession();
    } catch (e) { notify(false, e.message); }
    finally { setLoading(false); }
  };

  const n = session?.participants?.length || 0;
  const canvasH = Math.max(120, TOP_PAD + n * LANE_H + 30);
  const isActive = session?.status === 'waiting' || session?.status === 'racing';

  return (
    <div className="page">
      <div className="section-header">
        <h2>🔮 Marble Race</h2>
        <div className="accent-line" />
        <p style={{ color: '#9090b0', marginTop: 8, fontSize: '0.88rem' }}>
          Inscribite con tu nick y competí en la carrera de canicas en vivo.
        </p>
      </div>

      {(msg || err) && (
        <div className={`alert ${msg ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg || err}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '12px 18px' }}>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#6a6a8a', fontSize: '0.8rem', letterSpacing: 1 }}>ADMIN</span>
          <button className="btn btn-primary btn-sm" onClick={async () => {
            try { await api.createMarble(); await fetchSession(); notify(true, 'Carrera creada — inscripciones abiertas'); }
            catch (e) { notify(false, e.message); }
          }}>+ Nueva carrera</button>
          {session?.status === 'waiting' && (
            <button className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg,#00aa44,#006622)', borderColor: '#00cc66' }}
              onClick={async () => {
                if (!n) return notify(false, 'No hay participantes aún');
                try { await api.startMarble(); await fetchSession(); }
                catch (e) { notify(false, e.message); }
              }}>▶ Iniciar carrera</button>
          )}
          <button className="btn btn-secondary btn-sm" style={{ borderColor: '#ff3355', color: '#ff6688' }}
            onClick={async () => {
              try { await api.resetMarble(); stopAnim(); startRef.current = null; setPhase('idle'); await fetchSession(); }
              catch (e) { notify(false, e.message); }
            }}>↺ Reset</button>
        </div>
      )}

      {/* No active session */}
      {!isActive && phase !== 'done' && (
        <div className="empty">
          <div className="empty-icon">🔮</div>
          <p>{isAdmin ? 'Creá una carrera nueva para abrir las inscripciones.' : 'Esperá al admin para abrir la inscripción.'}</p>
        </div>
      )}

      {/* Join form */}
      {session?.status === 'waiting' && !joined && (
        <div className="card" style={{ maxWidth: 420, marginBottom: 16 }}>
          <div className="card-title">🏁 Inscribite a la carrera</div>
          <p style={{ color: '#9090b0', fontSize: '0.85rem', marginBottom: 14 }}>
            Ingresá tu nick de Twitch o Albion para participar:
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Tu nombre..." value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && join()}
              maxLength={20} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={join} disabled={loading}>
              {loading ? '…' : '¡Unirme!'}
            </button>
          </div>
        </div>
      )}

      {session?.status === 'waiting' && joined && (
        <div className="alert alert-success" style={{ marginBottom: 16, maxWidth: 420 }}>
          ✅ Inscripto como <strong>{name}</strong>. ¡Esperá que el admin inicie la carrera!
        </div>
      )}

      {/* Participant chips */}
      {session?.status === 'waiting' && n > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#6a6a8a', fontSize: '0.8rem', letterSpacing: 1, marginBottom: 10 }}>
            PARTICIPANTES ({n})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {session.participants.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.color + '18', border: `1px solid ${p.color}55`, borderRadius: 20, padding: '4px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: `0 0 6px ${p.color}` }} />
                <span style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Race canvas */}
      {isActive && n > 0 && (
        <div>
          {phase === 'racing' && (
            <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ff4444', letterSpacing: 4, marginBottom: 10 }}>
              ● EN VIVO
            </div>
          )}
          <canvas ref={canvasRef} width={900} height={canvasH}
            style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,212,255,0.12)', display: 'block' }} />
        </div>
      )}

      {/* Winner banner */}
      {session?.winner_name && (phase === 'done' || session?.status === 'racing') && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center', border: '2px solid #ffd700', background: 'rgba(255,215,0,0.05)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏆</div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2.2rem', color: '#ffd700' }}>
            {session.winner_name}
          </div>
          <div style={{ color: '#9090b0', marginTop: 6 }}>¡Ganador de la Marble Race!</div>
        </div>
      )}
    </div>
  );
}
