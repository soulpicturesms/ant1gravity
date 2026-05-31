import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

const GAME_TYPE = 'ruleta-rusa';
const W = 700, H = 560;
const CX = 350, CY = 260;
const PLAYER_R = 195;
const PR = 17;
const NEEDLE_L = 140;
const RACE_MS = 30000;

function mkRand(seed) {
  let s = ((seed ^ 0x89abcdef) >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function genRuletaRusa(participants, seedStr, winnerName) {
  if (!participants.length) return { players: [], events: [], keyframes: [], spinDuration: 2000 };
  const seed = parseInt(seedStr) || 1;
  const rand = mkRand(seed ^ 0xF00D);
  const n = participants.length;

  const victims = participants.filter(p => p.name !== winnerName);
  for (let i = victims.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [victims[i], victims[j]] = [victims[j], victims[i]];
  }

  const timePerElim = Math.max(3200, Math.min(8000, (RACE_MS - 2000) / Math.max(1, n - 1)));
  const spinDuration = Math.min(2200, timePerElim * 0.65);

  const players = participants.map((p, i) => ({
    name: p.name,
    color: p.color || '#00d4ff',
    angle: (i / n) * Math.PI * 2 - Math.PI / 2,
    isWinner: p.name === winnerName,
    index: i,
  }));

  const events = victims.map((v, i) => {
    const eventTime = (i + 1) * timePerElim;
    const spinStartTime = eventTime - spinDuration;
    const victimPlayer = players.find(p => p.name === v.name);
    const targetAngle = victimPlayer ? victimPlayer.angle : 0;
    const rotations = 3 + Math.floor(rand() * 4);
    return { name: v.name, eventTime, spinStartTime, targetAngle, rotations };
  });

  // Pre-compute needle keyframes
  const IDLE_SPEED = 0.00025;
  const keyframes = [{ time: 0, angle: -Math.PI / 2 }];
  let curAngle = -Math.PI / 2;
  let curTime = 0;

  for (const ev of events) {
    // Idle segment
    const idleDelta = (ev.spinStartTime - curTime) * IDLE_SPEED;
    curAngle += idleDelta;
    curTime = ev.spinStartTime;
    keyframes.push({ time: curTime, angle: curAngle, phase: 'spinStart' });

    // Spin to target
    const normalized = ev.targetAngle - Math.PI / 2; // needle points right when angle=0 from default
    let delta = (normalized - (curAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (delta < 0.1) delta += Math.PI * 2;
    curAngle += Math.PI * 2 * ev.rotations + delta;
    curTime = ev.eventTime;
    keyframes.push({ time: curTime, angle: curAngle, phase: 'impact', name: ev.name });
  }

  // Final idle tail
  const winnerPlayer = players.find(p => p.name === winnerName);
  if (winnerPlayer && events.length > 0) {
    const lastEv = events[events.length - 1];
    curAngle += (RACE_MS - lastEv.eventTime) * IDLE_SPEED;
    keyframes.push({ time: RACE_MS, angle: curAngle, phase: 'idle' });
  }

  return {
    players: players.map(p => ({
      ...p,
      elimTime: events.find(e => e.name === p.name)?.eventTime || (RACE_MS + 2500),
    })),
    events,
    keyframes,
    spinDuration,
  };
}

function getNeedleAngle(keyframes, spinDuration, elapsed) {
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i], k1 = keyframes[i + 1];
    if (elapsed >= k0.time && elapsed < k1.time) {
      const t = (elapsed - k0.time) / (k1.time - k0.time);
      if (k1.phase === 'impact') {
        // Ease out cubic
        const eased = 1 - Math.pow(1 - Math.min(1, t), 3);
        return k0.angle + (k1.angle - k0.angle) * eased;
      }
      return k0.angle + (k1.angle - k0.angle) * t;
    }
  }
  const last = keyframes[keyframes.length - 1];
  if (!last) return 0;
  return last.angle + (elapsed - last.time) * 0.00025;
}

function drawFrame(ctx, gameData, elapsed) {
  if (!gameData) return;
  const { players, events, keyframes, spinDuration } = gameData;

  ctx.fillStyle = '#06060d';
  ctx.fillRect(0, 0, W, H);

  // Outer decorative rings
  for (let r = PLAYER_R + 45; r <= PLAYER_R + 65; r += 10) {
    ctx.strokeStyle = 'rgba(180,30,30,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Table surface
  const tableG = ctx.createRadialGradient(CX, CY, 0, CX, CY, PLAYER_R + 40);
  tableG.addColorStop(0, '#1a0808');
  tableG.addColorStop(0.5, '#140606');
  tableG.addColorStop(1, '#0a0404');
  ctx.fillStyle = tableG;
  ctx.beginPath();
  ctx.arc(CX, CY, PLAYER_R + 40, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring border
  ctx.strokeStyle = '#6a1010';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#aa2020';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(CX, CY, PLAYER_R + 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Spoke lines from center
  for (let i = 0; i < players.length; i++) {
    const a = players[i].angle;
    ctx.strokeStyle = 'rgba(100,15,15,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a) * (PLAYER_R + 38), CY + Math.sin(a) * (PLAYER_R + 38));
    ctx.stroke();
  }

  // Inner circle
  const innerG = ctx.createRadialGradient(CX, CY, 0, CX, CY, 65);
  innerG.addColorStop(0, '#1e0a0a');
  innerG.addColorStop(1, '#120606');
  ctx.fillStyle = innerG;
  ctx.beginPath();
  ctx.arc(CX, CY, 65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a1010';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, CY, 65, 0, Math.PI * 2);
  ctx.stroke();

  // Revolver cylinder icon in center
  ctx.strokeStyle = '#8a2020';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ca = (i / 6) * Math.PI * 2;
    const cr = 28;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(ca) * cr * 0.5, CY + Math.sin(ca) * cr * 0.5, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Players
  for (const p of players) {
    const dead = elapsed >= p.elimTime;
    const px = CX + Math.cos(p.angle) * PLAYER_R;
    const py = CY + Math.sin(p.angle) * PLAYER_R;

    if (dead) {
      const tAfter = elapsed - p.elimTime;
      const fade = Math.max(0.15, 1 - tAfter / 800);
      ctx.save();
      ctx.globalAlpha = fade * 0.25;
      ctx.fillStyle = '#330000';
      ctx.beginPath();
      ctx.arc(px, py, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade * 0.45;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', px, py);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
      continue;
    }

    // Check if this player is the current target
    const isTarget = events.some(ev => ev.name === p.name && elapsed >= ev.spinStartTime - 200 && elapsed < ev.eventTime + 100);

    // Pulse glow for targeted player
    if (isTarget) {
      const pulse = 0.6 + 0.4 * Math.sin(elapsed * 0.02);
      const ig = ctx.createRadialGradient(px, py, 0, px, py, PR * 3);
      ig.addColorStop(0, `rgba(255,0,0,${0.6 * pulse})`);
      ig.addColorStop(1, 'transparent');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(px, py, PR * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Normal glow
    const glowG = ctx.createRadialGradient(px, py, 0, px, py, PR * 2.5);
    glowG.addColorStop(0, `${p.color}40`);
    glowG.addColorStop(1, 'transparent');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.arc(px, py, PR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(px, py, PR, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = isTarget ? '#ff3333' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = isTarget ? 3 : 2;
    ctx.stroke();

    // Highlight
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px - PR * 0.3, py - PR * 0.3, PR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Name label (outside the ring)
    const labelR = PLAYER_R + PR + 16;
    const lx = CX + Math.cos(p.angle) * labelR;
    const ly = CY + Math.sin(p.angle) * labelR;
    ctx.save();
    ctx.translate(lx, ly);
    // Rotate to face outward
    let rot = p.angle;
    if (rot > Math.PI / 2 || rot < -Math.PI / 2) rot += Math.PI;
    ctx.rotate(rot + Math.PI / 2);
    ctx.font = 'bold 10px Rajdhani, sans-serif';
    ctx.fillStyle = isTarget ? '#ff6666' : 'rgba(220,220,240,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(p.name.substring(0, 12), 0, 0);
    ctx.restore();

    // Winner crown
    if (p.isWinner && elapsed > RACE_MS) {
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', px, py - PR - 12);
    }
  }

  // Needle
  const needleAngle = getNeedleAngle(keyframes, spinDuration, elapsed);
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(needleAngle);

  // Needle shadow
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 8;

  // Needle body
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-25, 0);
  ctx.lineTo(NEEDLE_L, 0);
  ctx.stroke();

  // Arrow head
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.moveTo(NEEDLE_L, 0);
  ctx.lineTo(NEEDLE_L - 18, -7);
  ctx.lineTo(NEEDLE_L - 18, 7);
  ctx.closePath();
  ctx.fill();

  // Counter-end
  ctx.fillStyle = '#661111';
  ctx.beginPath();
  ctx.arc(-20, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();

  // Needle pin
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(CX, CY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff8888';
  ctx.lineWidth = 2;
  ctx.stroke();

  // BANG! animation
  for (const ev of events) {
    const tAfter = elapsed - ev.eventTime;
    if (tAfter >= 0 && tAfter < 1200) {
      const fp = tAfter / 1200;
      const victim = players.find(p => p.name === ev.name);
      if (!victim) continue;
      const vx = CX + Math.cos(victim.angle) * PLAYER_R;
      const vy = CY + Math.sin(victim.angle) * PLAYER_R;

      // Screen flash
      if (tAfter < 200) {
        ctx.save();
        ctx.globalAlpha = (1 - tAfter / 200) * 0.4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Explosion at victim
      const exR = 15 + fp * 50;
      ctx.save();
      ctx.globalAlpha = 1 - fp;
      const eg = ctx.createRadialGradient(vx, vy, 0, vx, vy, exR);
      eg.addColorStop(0, 'rgba(255,255,80,0.95)');
      eg.addColorStop(0.4, 'rgba(255,40,0,0.7)');
      eg.addColorStop(1, 'transparent');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(vx, vy, exR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // BANG! text near center
      if (tAfter < 900) {
        const bangAlpha = tAfter < 450 ? tAfter / 450 : 1 - (tAfter - 450) / 450;
        const bangScale = 1 + Math.min(1, tAfter / 200) * 0.4;
        ctx.save();
        ctx.globalAlpha = bangAlpha;
        ctx.translate(CX, CY - 20);
        ctx.scale(bangScale, bangScale);
        ctx.font = 'bold 32px Rajdhani, sans-serif';
        ctx.fillStyle = '#ff3333';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.fillText('BANG!', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  }

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Rajdhani, sans-serif';
  ctx.fillStyle = '#cc2222';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 8;
  ctx.fillText('🔫  RULETA RUSA', W / 2, 26);
  ctx.shadowBlur = 0;

  // Timer / winner
  if (elapsed < RACE_MS) {
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${((RACE_MS - elapsed) / 1000).toFixed(1)}s`, W / 2, H - 12);
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

export default function RuletaRusa() {
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
    const gameData = genRuletaRusa(participants, session.seed, session.winner_name);
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
        <span style={{ fontSize: '2.2rem' }}>🔫</span>
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#cc2222', margin: 0, letterSpacing: '0.08em' }}>RULETA RUSA</h1>
          <p style={{ color: '#6a6a8a', margin: 0, fontSize: '0.88rem' }}>La aguja gira y elimina uno a uno — ~30 segundos</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 auto', position: 'relative' }}>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ display: 'block', borderRadius: 12, border: '1px solid #2a1a1a', background: '#06060d', maxWidth: '100%' }} />
          {!isRacing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,6,13,0.88)', borderRadius: 12 }}>
              <div style={{ textAlign: 'center', color: '#9090b0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🔫</div>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#cc2222', letterSpacing: '0.1em' }}>
                  {isWaiting ? 'MESA EN ESPERA' : 'SIN SESIÓN'}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: 8, color: '#6a6a8a' }}>
                  {isWaiting ? `${participants.length} jugador${participants.length !== 1 ? 'es' : ''} en la mesa` : 'El admin debe abrir la mesa'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isAdmin && (
            <div style={{ background: '#0f0f1a', border: '1px solid #2a1a1a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#cc2222', marginBottom: 12, letterSpacing: '0.12em' }}>CONTROLES ADMIN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => adminAction('create')} disabled={adminLoading} className="btn btn-secondary btn-sm">+ Crear sesión nueva</button>
                <button onClick={() => adminAction('start')} disabled={adminLoading || !isWaiting || participants.length < 2} className="btn btn-primary btn-sm">
                  🔫 Iniciar ruleta ({participants.length})
                </button>
                <button onClick={() => adminAction('reset')} disabled={adminLoading}
                  style={{ background: 'transparent', border: '1px solid #3a1122', color: '#ff4466', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.82rem' }}>
                  Resetear
                </button>
              </div>
            </div>
          )}

          {isWaiting && !joined && (
            <div style={{ background: '#0f0f1a', border: '1px solid #2a1a1a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#cc2222', marginBottom: 12, letterSpacing: '0.12em' }}>UNIRSE A LA MESA</div>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" maxLength={20}
                  style={{ background: '#1a1a2a', border: '1px solid #2a1a1a', borderRadius: 6, padding: '8px 12px', color: 'white', fontFamily: 'Rajdhani', fontSize: '0.95rem', outline: 'none' }} />
                {joinError && <div style={{ color: '#ff6688', fontSize: '0.82rem' }}>{joinError}</div>}
                <button type="submit" disabled={joinLoading || !name.trim()} className="btn btn-primary btn-sm">
                  {joinLoading ? 'Entrando...' : '🔫 Sentarse a la mesa'}
                </button>
              </form>
            </div>
          )}

          {isWaiting && joined && (
            <div style={{ background: '#150606', border: '1px solid #441111', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🔫</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ff6666', fontSize: '1rem' }}>¡Estás en la mesa!</div>
              <div style={{ color: '#8a4a4a', fontSize: '0.82rem', marginTop: 4 }}>Esperando que gire la ruleta...</div>
            </div>
          )}

          {isRacing && session.winner_name && (
            <div style={{ background: '#140f00', border: '1px solid #443800', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem', color: '#8a7a00', letterSpacing: '0.14em', marginBottom: 4 }}>SOBREVIVIENTE</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#ffd700' }}>🏆 {session.winner_name}</div>
            </div>
          )}

          {participants.length > 0 && (
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e30', borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 10, letterSpacing: '0.12em' }}>
                EN LA MESA ({participants.length})
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
              <span style={{ color: '#3a3a5a' }}>{isAdmin ? 'Crea una sesión para comenzar.' : 'Espera que el admin abra la mesa.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
