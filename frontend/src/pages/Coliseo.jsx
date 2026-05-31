import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

const GAME_TYPE = 'coliseo';
const W = 700, H = 620;
const CX = 350, CY = 300;
const ARENA_R = 225;
const GR = 13;
const RACE_MS = 30000;

function mkRand(seed) {
  let s = ((seed ^ 0x89abcdef) >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function genGlads(participants, seedStr, winnerName) {
  if (!participants.length) return [];
  const seed = parseInt(seedStr) || 1;
  const rand = mkRand(seed ^ 0xC0DE1234);
  const n = participants.length;

  const victims = participants.filter(p => p.name !== winnerName);
  for (let i = victims.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [victims[i], victims[j]] = [victims[j], victims[i]];
  }
  const timePerElim = n > 1 ? RACE_MS / (n - 1) : RACE_MS;

  return participants.map((p, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const vi = victims.findIndex(v => v.name === p.name);
    const elimTime = vi >= 0 ? (vi + 1) * timePerElim : RACE_MS + 2500;
    return {
      name: p.name,
      color: p.color || '#00d4ff',
      startAngle: angle,
      orbitSpeed: 0.00022 + rand() * 0.00028,
      orbitPhase: rand() * Math.PI * 2,
      orbitR: (0.44 + rand() * 0.26) * ARENA_R,
      rOscAmp: 0.06 + rand() * 0.11,
      rOscSpeed: 0.0007 + rand() * 0.0014,
      rOscPhase: rand() * Math.PI * 2,
      isWinner: p.name === winnerName,
      elimTime,
      deathX: CX + Math.cos(angle) * ARENA_R * 0.32,
      deathY: CY + Math.sin(angle) * ARENA_R * 0.32,
    };
  });
}

function getPos(g, t) {
  if (t >= g.elimTime) return { x: g.deathX, y: g.deathY };
  const tte = g.elimTime - t;
  const rm = 1 + g.rOscAmp * Math.sin(t * g.rOscSpeed + g.rOscPhase);
  const ox = CX + Math.cos(g.startAngle + t * g.orbitSpeed + g.orbitPhase) * g.orbitR * rm;
  const oy = CY + Math.sin(g.startAngle + t * g.orbitSpeed + g.orbitPhase) * g.orbitR * rm;
  if (tte >= 2600) return { x: ox, y: oy };
  const prog = Math.pow(1 - tte / 2600, 2);
  return { x: ox + (g.deathX - ox) * prog, y: oy + (g.deathY - oy) * prog };
}

function drawFrame(ctx, glads, elapsed) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#07070e';
  ctx.fillRect(0, 0, W, H);

  // Arena floor
  const fg = ctx.createRadialGradient(CX, CY, 0, CX, CY, ARENA_R);
  fg.addColorStop(0, '#4e3214');
  fg.addColorStop(0.65, '#36220a');
  fg.addColorStop(1, '#1c1106');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(CX, CY, ARENA_R, 0, Math.PI * 2);
  ctx.fill();

  // Sand details (inner rings)
  for (const r of [ARENA_R * 0.35, ARENA_R * 0.6, ARENA_R * 0.82]) {
    ctx.strokeStyle = 'rgba(180,140,60,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Wall glow + border
  ctx.shadowColor = '#c89520';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = '#9e7c22';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(CX, CY, ARENA_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Torch glows
  for (let i = 0; i < 8; i++) {
    const ta = (i / 8) * Math.PI * 2;
    const tx = CX + Math.cos(ta) * (ARENA_R + 22);
    const ty = CY + Math.sin(ta) * (ARENA_R + 22);
    const fl = 0.5 + 0.5 * Math.sin(elapsed * 0.013 + i * 1.97);
    const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 30);
    tg.addColorStop(0, `rgba(255,110,0,${0.55 * fl})`);
    tg.addColorStop(1, 'transparent');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(tx, ty, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw dead gladiators first (so alive ones render on top)
  const sorted = [...glads].sort((a, b) => {
    const ad = elapsed >= a.elimTime, bd = elapsed >= b.elimTime;
    return Number(ad) - Number(bd);
  });

  for (const g of sorted) {
    const { x, y } = getPos(g, elapsed);
    const dead = elapsed >= g.elimTime;
    const tte = g.elimTime - elapsed;
    const hp = dead ? 0 : tte < 2600 ? tte / 2600 : 1;

    if (dead) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#330000';
      ctx.beginPath();
      ctx.arc(x, y, GR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - GR * 0.75, y - GR * 0.75); ctx.lineTo(x + GR * 0.75, y + GR * 0.75);
      ctx.moveTo(x + GR * 0.75, y - GR * 0.75); ctx.lineTo(x - GR * 0.75, y + GR * 0.75);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // Glow
    const glowC = hp < 0.35 ? '#ff2200' : g.color;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, GR * 3.8);
    gg.addColorStop(0, `${glowC}50`);
    gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, GR * 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(x, y, GR, 0, Math.PI * 2);
    ctx.fillStyle = g.color;
    ctx.fill();
    ctx.strokeStyle = hp < 0.35 ? '#ff5500' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Helmet arc
    ctx.beginPath();
    ctx.arc(x, y - 2, GR * 0.65, Math.PI + 0.3, -0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // HP bar
    const bw = 40, bh = 5;
    const bx = x - bw / 2, by = y - GR - 14;
    ctx.fillStyle = '#0e0e1c';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hp > 0.6 ? '#44ff55' : hp > 0.3 ? '#ffbb00' : '#ff3333';
    ctx.fillRect(bx, by, bw * hp, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    // Name label
    ctx.font = 'bold 9px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(g.name.substring(0, 12), x, y + GR + 14);

    // Death flash
    if (tte < 550 && tte > 0) {
      const fa = (1 - tte / 550) * 0.9;
      ctx.save();
      ctx.globalAlpha = fa;
      const df = ctx.createRadialGradient(x, y, 0, x, y, GR * 3);
      df.addColorStop(0, '#ff3300');
      df.addColorStop(1, 'transparent');
      ctx.fillStyle = df;
      ctx.beginPath();
      ctx.arc(x, y, GR * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Winner crown
    if (g.isWinner && elapsed > RACE_MS) {
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', x, y - GR - 16);
    }
  }

  // Clash sparks between close alive gladiators
  const alive = glads.filter(g => elapsed < g.elimTime - 250);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const pi = getPos(alive[i], elapsed);
      const pj = getPos(alive[j], elapsed);
      const d = Math.hypot(pi.x - pj.x, pi.y - pj.y);
      if (d < GR * 6.5) {
        const sp = 1 - d / (GR * 6.5);
        const mx = (pi.x + pj.x) / 2, my = (pi.y + pj.y) / 2;
        const sg = ctx.createRadialGradient(mx, my, 0, mx, my, GR * 2.8);
        sg.addColorStop(0, `rgba(255,235,80,${sp * 0.75})`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(mx, my, GR * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Rajdhani, sans-serif';
  ctx.fillStyle = '#c8a020';
  ctx.fillText('⚔️  COLISEO', CX, 26);

  // Timer / winner
  if (elapsed < RACE_MS) {
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${((RACE_MS - elapsed) / 1000).toFixed(1)}s`, CX, H - 12);
  } else {
    const w = glads.find(g => g.isWinner);
    if (w) {
      const fa = Math.min(1, (elapsed - RACE_MS) / 900);
      ctx.save();
      ctx.globalAlpha = fa;
      ctx.font = 'bold 26px Rajdhani, sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 28;
      ctx.fillText(`🏆  ${w.name}  GANA!`, CX, 54);
      ctx.restore();
    }
  }
}

export default function Coliseo() {
  const { isAdmin } = useAuth();
  const canvasRef = useRef(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const d = await api.getArenaSession(GAME_TYPE);
        if (!cancelled) { setSession(d.session); setParticipants(d.participants || []); }
      } catch {}
    };
    load();
    const iv = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (!session || session.status !== 'racing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const glads = genGlads(participants, session.seed, session.winner_name);
    const startedAt = new Date(session.started_at).getTime();
    let raf;
    const draw = () => {
      const elapsed = Date.now() - startedAt;
      drawFrame(canvas.getContext('2d'), glads, elapsed);
      if (elapsed < RACE_MS + 6000) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [session?.id, session?.status, participants.length]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setJoinLoading(true); setJoinError('');
    try {
      await api.joinArena(name.trim(), GAME_TYPE);
      setJoined(true);
      const d = await api.getArenaSession(GAME_TYPE);
      setSession(d.session); setParticipants(d.participants || []);
    } catch (err) { setJoinError(err.message); }
    setJoinLoading(false);
  };

  const adminAction = async (action) => {
    setAdminLoading(true);
    try {
      if (action === 'create') await api.createArena(GAME_TYPE);
      else if (action === 'start') await api.startArena(GAME_TYPE);
      else if (action === 'reset') await api.resetArena(GAME_TYPE);
      const d = await api.getArenaSession(GAME_TYPE);
      setSession(d.session); setParticipants(d.participants || []);
    } catch (err) { alert(err.message); }
    setAdminLoading(false);
  };

  const isWaiting = session?.status === 'waiting';
  const isRacing = session?.status === 'racing';

  return (
    <div style={{ minHeight: '80vh', padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: '2.2rem' }}>⚔️</span>
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#ffd700', margin: 0, letterSpacing: '0.08em' }}>COLISEO</h1>
          <p style={{ color: '#6a6a8a', margin: 0, fontSize: '0.88rem' }}>Gladiadores combaten hasta que queda uno en pie — ~30 segundos</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Canvas */}
        <div style={{ flex: '0 0 auto', position: 'relative' }}>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ display: 'block', borderRadius: 12, border: '1px solid #2a2a40', background: '#07070e', maxWidth: '100%' }} />
          {!isRacing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,14,0.88)', borderRadius: 12 }}>
              <div style={{ textAlign: 'center', color: '#9090b0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>⚔️</div>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#ffd700', letterSpacing: '0.1em' }}>
                  {isWaiting ? 'ARENA EN ESPERA' : 'SIN SESIÓN'}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: 8, color: '#6a6a8a' }}>
                  {isWaiting ? `${participants.length} gladiador${participants.length !== 1 ? 'es' : ''} inscrito${participants.length !== 1 ? 's' : ''}` : 'El admin debe abrir el Coliseo'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {isAdmin && (
            <div style={{ background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#ffd700', marginBottom: 12, letterSpacing: '0.12em' }}>CONTROLES ADMIN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => adminAction('create')} disabled={adminLoading} className="btn btn-secondary btn-sm">
                  + Crear sesión nueva
                </button>
                <button onClick={() => adminAction('start')} disabled={adminLoading || !isWaiting || participants.length < 2} className="btn btn-primary btn-sm">
                  ⚔️ Iniciar combate ({participants.length})
                </button>
                <button onClick={() => adminAction('reset')} disabled={adminLoading}
                  style={{ background: 'transparent', border: '1px solid #3a1122', color: '#ff4466', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.82rem' }}>
                  Resetear
                </button>
              </div>
            </div>
          )}

          {isWaiting && !joined && (
            <div style={{ background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#ffd700', marginBottom: 12, letterSpacing: '0.12em' }}>ENTRAR AL COLISEO</div>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre de gladiador" maxLength={20}
                  style={{ background: '#1a1a2a', border: '1px solid #2a2a40', borderRadius: 6, padding: '8px 12px', color: 'white', fontFamily: 'Rajdhani', fontSize: '0.95rem', outline: 'none' }} />
                {joinError && <div style={{ color: '#ff6688', fontSize: '0.82rem' }}>{joinError}</div>}
                <button type="submit" disabled={joinLoading || !name.trim()} className="btn btn-primary btn-sm">
                  {joinLoading ? 'Inscribiendo...' : '⚔️ Entrar al arena'}
                </button>
              </form>
            </div>
          )}

          {isWaiting && joined && (
            <div style={{ background: '#0f1f08', border: '1px solid #224422', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⚔️</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#44ff88', fontSize: '1rem' }}>¡Estás en el Coliseo!</div>
              <div style={{ color: '#5a8a5a', fontSize: '0.82rem', marginTop: 4 }}>Esperando que el admin inicie...</div>
            </div>
          )}

          {isRacing && session.winner_name && (
            <div style={{ background: '#140f00', border: '1px solid #443800', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem', color: '#8a7a00', letterSpacing: '0.14em', marginBottom: 4 }}>CAMPEÓN DEL COLISEO</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#ffd700' }}>🏆 {session.winner_name}</div>
            </div>
          )}

          {participants.length > 0 && (
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e30', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 10, letterSpacing: '0.12em' }}>
                GLADIADORES ({participants.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 280, overflowY: 'auto' }}>
                {participants.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #1a1a28' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}88` }} />
                    <span style={{ fontFamily: 'Rajdhani', color: '#c0c0d8', fontSize: '0.88rem', flex: 1 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!session && (
            <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 24, fontSize: '0.85rem', background: '#0a0a14', borderRadius: 10, border: '1px solid #1a1a28' }}>
              No hay sesión activa.<br />
              <span style={{ color: '#3a3a5a' }}>{isAdmin ? 'Crea una sesión para comenzar.' : 'Espera que el admin abra el Coliseo.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
