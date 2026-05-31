import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

const GAME_TYPE = 'meteoros';
const W = 700, H = 500;
const GROUND_Y = 400;
const PR = 16;
const RACE_MS = 30000;

function mkRand(seed) {
  let s = ((seed ^ 0x89abcdef) >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function genMeteoros(participants, seedStr, winnerName) {
  if (!participants.length) return { players: [], meteors: [], stars: [] };
  const seed = parseInt(seedStr) || 1;
  const rand = mkRand(seed ^ 0xFACE);
  const n = participants.length;

  const victims = participants.filter(p => p.name !== winnerName);
  for (let i = victims.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [victims[i], victims[j]] = [victims[j], victims[i]];
  }

  const margin = 70;
  const spacing = n > 1 ? (W - margin * 2) / (n - 1) : 0;

  const playerMap = participants.reduce((m, p, i) => {
    m[p.name] = { x: margin + i * (n > 1 ? spacing : 0), y: GROUND_Y };
    return m;
  }, {});

  const timePerElim = n > 1 ? (RACE_MS - 4000) / (n - 1) : RACE_MS;
  const meteors = victims.map((v, i) => ({
    name: v.name,
    impactTime: 3500 + i * timePerElim,
    x: playerMap[v.name]?.x || W / 2,
  }));

  const stars = Array.from({ length: 130 }, () => ({
    x: rand() * W,
    y: rand() * (GROUND_Y - 50),
    r: rand() * 1.6 + 0.3,
    twinkleOffset: rand() * Math.PI * 2,
  }));

  const players = participants.map((p, i) => {
    const mx = playerMap[p.name]?.x || W / 2;
    const ev = meteors.find(m => m.name === p.name);
    return {
      name: p.name,
      color: p.color || '#00d4ff',
      x: mx,
      y: GROUND_Y,
      isWinner: p.name === winnerName,
      elimTime: ev ? ev.impactTime : RACE_MS + 2500,
    };
  });

  return { players, meteors, stars };
}

function drawFrame(ctx, gameData, elapsed) {
  if (!gameData) return;
  const { players, meteors, stars } = gameData;

  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const s of stars) {
    const tw = 0.45 + 0.55 * Math.sin(elapsed * 0.0018 + s.twinkleOffset);
    ctx.globalAlpha = tw * 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Distant planet
  const pg = ctx.createRadialGradient(580, 80, 0, 580, 80, 38);
  pg.addColorStop(0, '#3a1a5a');
  pg.addColorStop(0.6, '#1a0a30');
  pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(580, 80, 38, 0, Math.PI * 2);
  ctx.fill();

  // Ground
  const groundG = ctx.createLinearGradient(0, GROUND_Y - 15, 0, H);
  groundG.addColorStop(0, '#1a2808');
  groundG.addColorStop(1, '#0a1404');
  ctx.fillStyle = groundG;
  ctx.fillRect(0, GROUND_Y - 15, W, H - GROUND_Y + 15);

  // Ground line
  ctx.strokeStyle = '#2a4a14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 15); ctx.lineTo(W, GROUND_Y - 15);
  ctx.stroke();

  // Ground grid lines
  ctx.strokeStyle = 'rgba(40,80,20,0.3)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y - 15); ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Crater marks for already-hit players
  for (const m of meteors) {
    const tAfter = elapsed - m.impactTime;
    if (tAfter > 800) {
      const player = players.find(p => p.name === m.name);
      if (!player) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, (tAfter - 800) / 500);
      ctx.strokeStyle = '#553300';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(player.x, player.y, PR * 1.8, PR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Warning shadows (before meteor impact)
  for (const m of meteors) {
    const tti = m.impactTime - elapsed;
    if (tti > 0 && tti < 2800) {
      const player = players.find(p => p.name === m.name);
      if (!player) continue;
      const alpha = Math.min(0.9, (2800 - tti) / 600);
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.015);

      // Shadow on ground
      const sg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 35);
      sg.addColorStop(0, `rgba(200,60,0,${alpha * 0.4 * pulse})`);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
      ctx.fill();

      // Dashed warning ring
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,0,${alpha * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(player.x, player.y - 2, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair
      ctx.strokeStyle = `rgba(255,100,0,${alpha * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(player.x - 22, player.y - 2); ctx.lineTo(player.x + 22, player.y - 2);
      ctx.moveTo(player.x, player.y - 24); ctx.lineTo(player.x, player.y + 20);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Meteors in flight
  for (const m of meteors) {
    const tti = m.impactTime - elapsed;
    if (tti > 0 && tti < 2200) {
      const player = players.find(p => p.name === m.name);
      if (!player) continue;
      const flightProg = Math.pow(1 - tti / 2200, 1.6);
      const my = -70 + (player.y + 70) * flightProg;
      const r = 10 + (1 - flightProg) * 5;

      // Flame trail
      for (let t = 0; t < 6; t++) {
        const tp = flightProg - t * 0.045;
        if (tp < 0) continue;
        const ty = -70 + (player.y + 70) * Math.pow(tp, 1.6);
        ctx.globalAlpha = (1 - t / 6) * 0.45;
        ctx.fillStyle = t < 2 ? '#ff8800' : '#ff4400';
        ctx.beginPath();
        ctx.arc(m.x, ty, r * (1 - t * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Meteor core
      const mg = ctx.createRadialGradient(m.x, my, 0, m.x, my, r);
      mg.addColorStop(0, '#ffffaa');
      mg.addColorStop(0.35, '#ff8800');
      mg.addColorStop(1, '#cc2200');
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 18;
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(m.x, my, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Explosion
    const tAfter = elapsed - m.impactTime;
    if (tAfter >= 0 && tAfter < 1800) {
      const player = players.find(p => p.name === m.name);
      if (!player) continue;
      const ep = tAfter / 1800;
      const exR = 12 + ep * 55;

      // Outer ring
      ctx.save();
      ctx.globalAlpha = 1 - ep;
      const eg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, exR);
      eg.addColorStop(0, 'rgba(255,255,120,0.9)');
      eg.addColorStop(0.4, 'rgba(255,90,0,0.7)');
      eg.addColorStop(0.7, 'rgba(180,30,0,0.4)');
      eg.addColorStop(1, 'transparent');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(player.x, player.y, exR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Shock ring
      if (tAfter < 600) {
        ctx.save();
        ctx.globalAlpha = (1 - tAfter / 600) * 0.7;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 8 + (tAfter / 600) * 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Players
  for (const p of players) {
    const dead = elapsed >= p.elimTime;
    const { x, y } = p;

    if (dead) {
      const tAfter = elapsed - p.elimTime;
      const fade = Math.max(0, 1 - tAfter / 1200);
      ctx.save();
      ctx.globalAlpha = fade * 0.3;
      ctx.fillStyle = '#440000';
      ctx.beginPath();
      ctx.arc(x, y, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    // Shake when very close to elimination
    const tti = p.elimTime - elapsed;
    const shakeAmt = tti < 400 ? Math.sin(elapsed * 0.2) * 3 * (1 - tti / 400) : 0;

    // Player glow
    const glowG = ctx.createRadialGradient(x + shakeAmt, y, 0, x + shakeAmt, y, PR * 3.5);
    glowG.addColorStop(0, `${p.color}45`);
    glowG.addColorStop(1, 'transparent');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.arc(x + shakeAmt, y, PR * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y - 4, PR, PR * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.arc(x + shakeAmt, y, PR, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + shakeAmt - PR * 0.3, y - PR * 0.3, PR * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Name
    ctx.font = 'bold 10px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(p.name.substring(0, 12), x, y - PR - 8);

    // Winner trophy
    if (p.isWinner && elapsed > RACE_MS) {
      ctx.font = '15px serif';
      ctx.fillText('🏆', x, y - PR - 26);
    }
  }

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Rajdhani, sans-serif';
  ctx.fillStyle = '#ff6600';
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 10;
  ctx.fillText('☄️  METEOROS', W / 2, 26);
  ctx.shadowBlur = 0;

  // Timer / winner
  if (elapsed < RACE_MS) {
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${((RACE_MS - elapsed) / 1000).toFixed(1)}s`, W / 2, H - 10);
  } else {
    const w = players.find(p => p.isWinner);
    if (w) {
      const fa = Math.min(1, (elapsed - RACE_MS) / 900);
      ctx.save();
      ctx.globalAlpha = fa;
      ctx.font = 'bold 26px Rajdhani, sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 25;
      ctx.fillText(`🏆  ${w.name}  SOBREVIVE!`, W / 2, 54);
      ctx.restore();
    }
  }
}

export default function Meteoros() {
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
    const gameData = genMeteoros(participants, session.seed, session.winner_name);
    const startedAt = new Date(session.started_at).getTime();
    let raf;
    const draw = () => {
      const elapsed = Date.now() - startedAt;
      drawFrame(canvas.getContext('2d'), gameData, elapsed);
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
        <span style={{ fontSize: '2.2rem' }}>☄️</span>
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#ff6600', margin: 0, letterSpacing: '0.08em' }}>METEOROS</h1>
          <p style={{ color: '#6a6a8a', margin: 0, fontSize: '0.88rem' }}>Sobreviví la lluvia de meteoros — ~30 segundos</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 auto', position: 'relative' }}>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ display: 'block', borderRadius: 12, border: '1px solid #2a2a40', background: '#020408', maxWidth: '100%' }} />
          {!isRacing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,4,8,0.88)', borderRadius: 12 }}>
              <div style={{ textAlign: 'center', color: '#9090b0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>☄️</div>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#ff6600', letterSpacing: '0.1em' }}>
                  {isWaiting ? 'ZONA DE ATERRIZAJE EN ESPERA' : 'SIN SESIÓN'}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: 8, color: '#6a6a8a' }}>
                  {isWaiting ? `${participants.length} superviviente${participants.length !== 1 ? 's' : ''} registrado${participants.length !== 1 ? 's' : ''}` : 'El admin debe iniciar la lluvia'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isAdmin && (
            <div style={{ background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#ff6600', marginBottom: 12, letterSpacing: '0.12em' }}>CONTROLES ADMIN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => adminAction('create')} disabled={adminLoading} className="btn btn-secondary btn-sm">+ Crear sesión nueva</button>
                <button onClick={() => adminAction('start')} disabled={adminLoading || !isWaiting || participants.length < 2} className="btn btn-primary btn-sm">
                  ☄️ Iniciar lluvia ({participants.length})
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
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#ff6600', marginBottom: 12, letterSpacing: '0.12em' }}>BUSCAR REFUGIO</div>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" maxLength={20}
                  style={{ background: '#1a1a2a', border: '1px solid #2a2a40', borderRadius: 6, padding: '8px 12px', color: 'white', fontFamily: 'Rajdhani', fontSize: '0.95rem', outline: 'none' }} />
                {joinError && <div style={{ color: '#ff6688', fontSize: '0.82rem' }}>{joinError}</div>}
                <button type="submit" disabled={joinLoading || !name.trim()} className="btn btn-primary btn-sm">
                  {joinLoading ? 'Entrando...' : '☄️ Entrar a la zona'}
                </button>
              </form>
            </div>
          )}

          {isWaiting && joined && (
            <div style={{ background: '#140a00', border: '1px solid #442200', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>☄️</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ff8844', fontSize: '1rem' }}>¡Estás en la zona!</div>
              <div style={{ color: '#7a5a3a', fontSize: '0.82rem', marginTop: 4 }}>Esperando que comiencen los meteoros...</div>
            </div>
          )}

          {isRacing && session.winner_name && (
            <div style={{ background: '#140f00', border: '1px solid #443800', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem', color: '#8a7a00', letterSpacing: '0.14em', marginBottom: 4 }}>SUPERVIVIENTE</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#ffd700' }}>🏆 {session.winner_name}</div>
            </div>
          )}

          {participants.length > 0 && (
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e30', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 10, letterSpacing: '0.12em' }}>
                SUPERVIVIENTES ({participants.length})
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
              <span style={{ color: '#3a3a5a' }}>{isAdmin ? 'Crea una sesión para comenzar.' : 'Espera que el admin inicie la lluvia de meteoros.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
