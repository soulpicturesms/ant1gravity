import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ── Physics / layout constants ─────────────────────────────────────────────────
const BALL_R   = 11;
const FRICTION = 0.987;
const CW = 920, CH = 480;          // canvas logical size
const TX = 34,  TY = 28;           // wood frame top-left
const TW = 852, TH = 424;          // wood frame size
const CU = 22;                     // cushion thickness
const FX = TX + CU, FY = TY + CU; // felt origin in canvas coords
const FW = TW - 2*CU;              // felt width  = 808
const FH = TH - 2*CU;              // felt height = 380
const PD = 17;                     // pocket detection radius

// Pocket centres in FELT coordinates
const POCKETS = [
  { x: 0,    y: 0    }, { x: FW/2, y: -5   }, { x: FW,   y: 0    },
  { x: 0,    y: FH   }, { x: FW/2, y: FH+5 }, { x: FW,   y: FH   },
];

// Ball colours (0=cue, 1-7=solids, 8=eight, 9-15=stripes)
const BCLR = [
  '#fff','#f5c518','#1a6bb8','#c0392b','#7b3fa0',
  '#e67e22','#27ae60','#8B4513','#111',
  '#f5c518','#1a6bb8','#c0392b','#7b3fa0','#e67e22','#27ae60','#8B4513',
];

// ── Initial rack ───────────────────────────────────────────────────────────────
function makeRack() {
  const balls = [{ id:0, x:FW*0.25, y:FH/2, vx:0, vy:0, pocketed:false }];
  const rx = FW * 0.70, ry = FH / 2;
  const dRow = BALL_R * 2 * Math.cos(Math.PI/6);
  const dCol = BALL_R * 2;
  const slots = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col <= row; col++)
      slots.push({ x: rx + row*dRow, y: ry - row*BALL_R + col*dCol });

  const others = [1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for (let i = others.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [others[i],others[j]] = [others[j],others[i]];
  }
  // 8-ball at slot 4 (center of 3-ball row)
  const ids = [...others.slice(0,4), 8, ...others.slice(4)];
  slots.forEach((s,i) => balls.push({ id:ids[i], x:s.x, y:s.y, vx:0, vy:0, pocketed:false }));
  return balls;
}

// ── Physics ────────────────────────────────────────────────────────────────────
function stepPhysics(balls) {
  const newlyPocketed = [];
  for (const b of balls) {
    if (b.pocketed) continue;
    b.x += b.vx; b.y += b.vy;
    b.vx *= FRICTION; b.vy *= FRICTION;
    if (Math.abs(b.vx) < 0.04) b.vx = 0;
    if (Math.abs(b.vy) < 0.04) b.vy = 0;
    // cushion bounce
    if (b.x < BALL_R)      { b.x = BALL_R;      b.vx =  Math.abs(b.vx)*0.72; }
    if (b.x > FW-BALL_R)   { b.x = FW-BALL_R;   b.vx = -Math.abs(b.vx)*0.72; }
    if (b.y < BALL_R)      { b.y = BALL_R;      b.vy =  Math.abs(b.vy)*0.72; }
    if (b.y > FH-BALL_R)   { b.y = FH-BALL_R;   b.vy = -Math.abs(b.vy)*0.72; }
  }
  // ball-ball collisions
  const active = balls.filter(b => !b.pocketed);
  for (let i = 0; i < active.length; i++) {
    for (let j = i+1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const dx = b.x-a.x, dy = b.y-a.y;
      const d2 = dx*dx + dy*dy, minD = BALL_R*2;
      if (d2 < minD*minD && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const nx = dx/d, ny = dy/d;
        const ovlp = (minD-d)/2;
        a.x -= nx*ovlp; a.y -= ny*ovlp;
        b.x += nx*ovlp; b.y += ny*ovlp;
        const rv = (a.vx-b.vx)*nx + (a.vy-b.vy)*ny;
        if (rv > 0) {
          a.vx -= rv*nx; a.vy -= rv*ny;
          b.vx += rv*nx; b.vy += rv*ny;
        }
      }
    }
  }
  // pocket detection
  for (const b of balls) {
    if (b.pocketed) continue;
    for (const p of POCKETS) {
      const dx = b.x-p.x, dy = b.y-p.y;
      if (dx*dx+dy*dy < PD*PD) {
        b.pocketed = true; b.vx = 0; b.vy = 0;
        newlyPocketed.push(b.id); break;
      }
    }
  }
  return newlyPocketed;
}

const allStopped = (balls) => balls.every(b => b.pocketed || (b.vx===0 && b.vy===0));

// Aim ray: returns {x,y} of first collision with object ball, else end of line
function aimRay(balls, cueBall, angle, maxLen=1200) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = maxLen, hitBall = null;
  for (const b of balls) {
    if (b.id===0 || b.pocketed) continue;
    const tx = b.x-cueBall.x, ty = b.y-cueBall.y;
    const proj = tx*dx + ty*dy;
    if (proj < 0) continue;
    const perp2 = tx*tx+ty*ty - proj*proj;
    const minD2 = (BALL_R*2)*(BALL_R*2);
    if (perp2 < minD2) {
      const hit = proj - Math.sqrt(minD2-perp2);
      if (hit > 0 && hit < best) { best = hit; hitBall = b; }
    }
  }
  return { ex: cueBall.x+dx*best, ey: cueBall.y+dy*best, hitBall, dist: best };
}

// ── Canvas rendering ───────────────────────────────────────────────────────────
function drawTable(ctx) {
  // Wood frame
  const wg = ctx.createLinearGradient(TX, TY, TX, TY+TH);
  wg.addColorStop(0, '#7a5028'); wg.addColorStop(0.5,'#4a2e10'); wg.addColorStop(1,'#2c1808');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.roundRect(TX, TY, TW, TH, 16);
  ctx.fill();
  // Gold trim
  ctx.strokeStyle = '#c9963d'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(TX+3, TY+3, TW-6, TH-6, 14); ctx.stroke();

  // Felt
  const fg = ctx.createRadialGradient(FX+FW/2, FY+FH/2, 10, FX+FW/2, FY+FH/2, FW*0.7);
  fg.addColorStop(0,'#1e6040'); fg.addColorStop(1,'#0c2e1c');
  ctx.fillStyle = fg;
  ctx.fillRect(FX, FY, FW, FH);

  // Felt texture
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let x = FX; x < FX+FW; x += 6) {
    ctx.fillRect(x, FY, 1, FH);
  }

  // Head string (dashed line at cue ball starting area)
  ctx.setLineDash([6,5]); ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  const hs = FX + FW * 0.25;
  ctx.beginPath(); ctx.moveTo(hs, FY+4); ctx.lineTo(hs, FY+FH-4); ctx.stroke();
  ctx.setLineDash([]);

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.font = 'bold 11px Unbounded,system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('ANT1GRAVITY BILLIARDS', FX+FW/2, FY+FH/2);

  // Pockets
  POCKETS.forEach(p => {
    const cx = FX+p.x, cy = FY+p.y;
    // Shadow
    const sg = ctx.createRadialGradient(cx,cy,0,cx,cy,PD+6);
    sg.addColorStop(0,'rgba(0,0,0,0.9)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx,cy,PD+6,0,Math.PI*2); ctx.fill();
    // Hole
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx,cy,PD-2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#c9963d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx,cy,PD+1,0,Math.PI*2); ctx.stroke();
  });
}

function drawBall(ctx, b) {
  if (b.pocketed) return;
  const cx = FX+b.x, cy = FY+b.y, r = BALL_R;

  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();

  if (b.id === 0) {
    ctx.fillStyle = '#fefefe'; ctx.fill();
  } else if (b.id <= 7) {
    ctx.fillStyle = BCLR[b.id]; ctx.fill();
  } else if (b.id === 8) {
    ctx.fillStyle = '#111'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,r*0.42,0,Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  } else {
    // stripe
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = BCLR[b.id];
    ctx.fillRect(cx-r, cy-r*0.52, r*2, r*1.04);
  }

  // Number
  if (b.id > 0) {
    if (b.id >= 9) {
      ctx.beginPath(); ctx.arc(cx,cy,r*0.38,0,Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.fillStyle = b.id<=7 ? '#fff' : (b.id===8 ? '#fff' : BCLR[b.id]);
    if (b.id===8) ctx.fillStyle='#fff';
    ctx.font = `bold ${r*0.82}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(b.id), cx, cy+0.5);
  }
  ctx.restore();

  // Shine
  const sh = ctx.createRadialGradient(cx-r*0.32,cy-r*0.32,0,cx,cy,r);
  sh.addColorStop(0,'rgba(255,255,255,0.45)'); sh.addColorStop(0.5,'rgba(255,255,255,0.0)'); sh.addColorStop(1,'rgba(0,0,0,0.12)');
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = sh; ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
}

function drawCue(ctx, cueBall, angle, power) {
  const cx = FX+cueBall.x, cy = FY+cueBall.y;
  const pullback = power * 28;
  const tipDist  = BALL_R + pullback + 5;
  const cueLen   = 190;
  const ax = -Math.cos(angle), ay = -Math.sin(angle);
  const sx = cx + ax*tipDist, sy = cy + ay*tipDist;
  const ex = cx + ax*(tipDist+cueLen), ey = cy + ay*(tipDist+cueLen);

  const g = ctx.createLinearGradient(sx,sy,ex,ey);
  g.addColorStop(0,'#2a1a08'); g.addColorStop(0.1,'#6b4a1e');
  g.addColorStop(0.5,'#c49a3c'); g.addColorStop(1,'#e8c96a');
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.strokeStyle = g; ctx.stroke();

  // Blue tip
  ctx.beginPath(); ctx.arc(sx,sy,3.5,0,Math.PI*2);
  ctx.fillStyle = '#4a90c4'; ctx.fill();
  ctx.strokeStyle = '#2a5c8a'; ctx.lineWidth=0.8; ctx.stroke();
}

function drawAimLine(ctx, cueBall, balls, angle) {
  const { ex, ey, hitBall } = aimRay(balls, cueBall, angle);
  const sx = FX+cueBall.x, sy = FY+cueBall.y;
  const tx = FX+ex, ty = FY+ey;

  // Main aim line
  ctx.setLineDash([6,5]); ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.setLineDash([]);

  // Ghost ball at impact
  if (hitBall) {
    ctx.beginPath(); ctx.arc(tx,ty,BALL_R,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Deflection arrow
    const inDx = Math.cos(angle), inDy = Math.sin(angle);
    const bDx = hitBall.x-ex, bDy = hitBall.y-ey;
    const bLen = Math.sqrt(bDx*bDx+bDy*bDy)||1;
    const nx = bDx/bLen, ny = bDy/bLen;
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = 'rgba(255,200,80,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(FX+hitBall.x,FY+hitBall.y);
    ctx.lineTo(FX+hitBall.x+nx*55, FY+hitBall.y+ny*55); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPowerBar(ctx, power) {
  const bx = TX+TW+10, by = TY, bw = 14, bh = TH;
  // Track
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath();
  ctx.roundRect(bx,by,bw,bh,7); ctx.fill();
  // Fill
  const fillH = bh * power;
  const r = power < 0.4 ? 80 : power < 0.7 ? 200 : 240;
  const g2 = power < 0.4 ? 200 : power < 0.7 ? 140 : 50;
  ctx.fillStyle = `rgb(${r},${g2},40)`;
  ctx.beginPath();
  ctx.roundRect(bx, by+bh-fillH, bw, fillH, 7); ctx.fill();
  // Label
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='bold 8px Inter,system-ui';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('PWR', bx+bw/2, by+4);
}

// ── Lobby ──────────────────────────────────────────────────────────────────────
function RoomList({ onJoin }) {
  const [rooms, setRooms]   = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName]     = useState('');
  const [mode, setMode]     = useState('1v1');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const load = () => api.billiardsGetRooms().then(setRooms).catch(()=>{});
    load(); const iv = setInterval(load, 3000); return () => clearInterval(iv);
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      const room = await api.billiardsCreateRoom({ name: name||'Mesa Billar', mode });
      await api.billiardsJoinRoom(room.id).catch(()=>{});
      const r = await api.billiardsGetRoom(room.id);
      onJoin(room.id, r.state);
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const join = async (id) => {
    setLoading(true);
    try {
      await api.billiardsJoinRoom(id);
      const r = await api.billiardsGetRoom(id);
      onJoin(id, r.state);
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.3rem', fontWeight:800, color:'#fff', marginBottom:24 }}>
        🎱 Billar <span style={{ color:'var(--c-accent)' }}>8-Ball</span>
      </div>

      {!creating ? (
        <button onClick={()=>setCreating(true)} style={{
          width:'100%', padding:14, marginBottom:20, borderRadius:10,
          background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
          border:'none', color:'#fff', fontFamily:'Unbounded,system-ui',
          fontSize:'0.75rem', fontWeight:700, cursor:'pointer',
        }}>+ CREAR MESA</button>
      ) : (
        <div style={{ background:'var(--c-surface)', border:'1px solid rgba(255,45,122,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la mesa"
              style={{ background:'var(--c-bg1)', border:'1px solid var(--c-line2)', borderRadius:8, padding:'10px 14px', color:'#fff', fontFamily:'Inter,system-ui' }} />
            <div style={{ display:'flex', gap:8 }}>
              {['1v1','2v2'].map(m => (
                <button key={m} onClick={()=>setMode(m)} style={{
                  flex:1, padding:'10px', borderRadius:8,
                  background: mode===m ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                  border: `1px solid ${mode===m ? 'rgba(255,45,122,0.4)' : 'var(--c-line2)'}`,
                  color: mode===m ? '#ff2d7a' : 'var(--c-text3)',
                  fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                }}>{m}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={create} disabled={loading} style={{
                flex:1, padding:10, borderRadius:8, background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
                border:'none', color:'#fff', fontWeight:700, cursor:'pointer',
              }}>Crear y Entrar</button>
              <button onClick={()=>setCreating(false)} style={{
                padding:'10px 14px', borderRadius:8, background:'var(--c-surface2)',
                border:'1px solid var(--c-line2)', color:'var(--c-text3)', cursor:'pointer',
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {rooms.length === 0 && !creating && (
        <div style={{ textAlign:'center', color:'var(--c-text3)', padding:'40px 0', fontSize:14 }}>No hay mesas activas. ¡Creá una!</div>
      )}
      {rooms.map(r => {
        const s = r.state || {};
        const cnt = s.players?.length || 0;
        const isFull = cnt >= (s.maxPlayers||2);
        const isPlaying = s.phase === 'playing';
        return (
          <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', marginBottom:10, background:'var(--c-surface)', border:'1px solid var(--c-line2)', borderRadius:12 }}>
            <div>
              <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{s.name||'Mesa Billar'} <span style={{ color:'var(--c-text4)', fontSize:11 }}>· {s.mode||'1v1'}</span></div>
              <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>{cnt}/{s.maxPlayers||2} jugadores · {isPlaying?'En juego':'Esperando'}</div>
            </div>
            <button disabled={isFull||isPlaying||loading} onClick={()=>join(r.id)} style={{
              padding:'8px 16px', borderRadius:8,
              background:(isFull||isPlaying)?'var(--c-surface2)':'rgba(255,45,122,0.12)',
              border:`1px solid ${(isFull||isPlaying)?'var(--c-line2)':'rgba(255,45,122,0.4)'}`,
              color:(isFull||isPlaying)?'var(--c-text4)':'#ff2d7a',
              fontWeight:700, fontSize:'0.75rem', cursor:(isFull||isPlaying)?'not-allowed':'pointer',
            }}>{isPlaying?'En juego':isFull?'Llena':'Unirse →'}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Billiards({ user }) {
  const [view, setView]         = useState('lobby');
  const [roomId, setRoomId]     = useState(null);
  const [serverState, setServerState] = useState(null);
  const [balls, setBalls]       = useState(null);   // local physics balls
  const [gamePhase, setGamePhase] = useState('waiting'); // local: waiting|aiming|placing|animating
  const [angle, setAngle]       = useState(0);
  const [power, setPower]       = useState(0);
  const [charging, setCharging] = useState(false);
  const [err, setErr]           = useState('');
  const [muted, setMuted]       = useState(casinoAudio.muted);

  const canvasRef     = useRef(null);
  const rafRef        = useRef(null);
  const chargeStart   = useRef(null);
  const chargeRaf     = useRef(null);
  const pocketedRef   = useRef([]);
  const foulRef       = useRef(false);
  const prevBallsRef  = useRef(null);

  // ── Sync server → local balls (only when not animating) ──
  useEffect(() => {
    if (!serverState?.balls) return;
    setBalls(serverState.balls.map(b => ({ ...b, vx:0, vy:0 })));
  }, [serverState?.balls]);

  // ── Polling ──
  useEffect(() => {
    if (!roomId || view !== 'game') return;
    const poll = async () => {
      try {
        const r = await api.billiardsGetRoom(roomId);
        setServerState(r.state);
      } catch {}
    };
    poll(); const iv = setInterval(poll, 2000); return () => clearInterval(iv);
  }, [roomId, view]);

  // ── Determine if it's my turn ──
  const state       = serverState || {};
  const players     = state.players || [];
  const teams       = state.teams   || [];
  const myTeamIdx   = players.find(p=>p.userId===user.id)?.team ?? -1;
  const myTeam      = teams[myTeamIdx] || { playerIds:[], group:null, pocketed:[] };
  const oppTeam     = teams[1-myTeamIdx] || { playerIds:[], group:null, pocketed:[] };
  const curTeam     = teams[state.currentTeam] || { playerIds:[] };
  const curPlayerId = curTeam.playerIds[state.currentPlayerInTeam % Math.max(1,curTeam.playerIds.length)];
  const isMyTurn    = curPlayerId === user.id && state.phase === 'playing' && gamePhase !== 'animating';
  const cueBall     = balls?.find(b=>b.id===0);

  // ── Canvas render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !balls) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.clearRect(0, 0, CW, CH);
      drawTable(ctx);

      // Aim line (only when aiming and my turn)
      if (isMyTurn && gamePhase === 'aiming' && cueBall) {
        drawAimLine(ctx, cueBall, balls, angle);
      }

      // Placing indicator
      if (isMyTurn && gamePhase === 'placing' && cueBall) {
        ctx.beginPath(); ctx.arc(FX+cueBall.x, FY+cueBall.y, BALL_R+4, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(111,255,125,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Balls
      if (balls) balls.forEach(b => drawBall(ctx, b));

      // Cue stick
      if (isMyTurn && (gamePhase==='aiming'||gamePhase==='charging') && cueBall) {
        drawCue(ctx, cueBall, angle, power);
      }

      // Power bar (when charging or aiming)
      if (isMyTurn && gamePhase !== 'placing') {
        drawPowerBar(ctx, power);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [balls, angle, power, gamePhase, isMyTurn, cueBall]);

  // ── Physics animation loop (runs when animating) ──
  const runPhysics = useCallback((ballsSnapshot) => {
    const localBalls = ballsSnapshot.map(b => ({ ...b }));
    pocketedRef.current = [];
    foulRef.current = false;
    let steps = 0;
    const tick = () => {
      for (let s = 0; s < 4; s++) {
        const p = stepPhysics(localBalls);
        pocketedRef.current.push(...p);
        if (p.includes(0)) foulRef.current = true;
      }
      setBalls(localBalls.map(b=>({...b})));
      steps++;
      if (!allStopped(localBalls) && steps < 2000) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Shot complete — report to server
        setGamePhase('waiting');
        const finalBalls = localBalls.map(({ id,x,y,pocketed }) => ({ id,x,y,pocketed }));
        api.billiardsShot(roomId, {
          balls: finalBalls,
          pocketedThisShot: [...new Set(pocketedRef.current)],
          foulCueBall: foulRef.current,
        }).then(r => {
          setServerState(r.state);
          if (foulRef.current) setGamePhase('placing');
        }).catch(e => setErr(e.message));
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [roomId]);

  // ── Mouse events ──
  const toFelt = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x:0, y:0 };
    const rect = canvas.getBoundingClientRect();
    const sx = CW/rect.width, sy = CH/rect.height;
    return {
      x: (e.clientX-rect.left)*sx - FX,
      y: (e.clientY-rect.top)*sy  - FY,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isMyTurn || !cueBall) return;
    const { x, y } = toFelt(e);
    if (gamePhase === 'placing') {
      // Move cue ball with mouse
      setBalls(prev => prev.map(b => b.id===0 ? {...b, x, y} : b));
      return;
    }
    if (gamePhase === 'aiming' || gamePhase === 'charging') {
      setAngle(Math.atan2(y - cueBall.y, x - cueBall.x));
    }
  }, [isMyTurn, cueBall, gamePhase, toFelt]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (!isMyTurn || !cueBall) return;

    if (gamePhase === 'placing') {
      // Place cue ball here
      const { x, y } = toFelt(e);
      api.billiardsPlaceCue(roomId, { x, y }).then(r => {
        setServerState(r.state);
        setGamePhase('aiming');
      }).catch(err => setErr(err.message));
      return;
    }

    if (gamePhase === 'aiming') {
      // Start charging
      setGamePhase('charging');
      chargeStart.current = Date.now();
      const chargeTick = () => {
        const elapsed = (Date.now() - chargeStart.current) / 1500; // 1.5s to full
        setPower(Math.min(1, elapsed));
        chargeRaf.current = requestAnimationFrame(chargeTick);
      };
      chargeRaf.current = requestAnimationFrame(chargeTick);
    }
  }, [isMyTurn, cueBall, gamePhase, roomId, toFelt]);

  const handleMouseUp = useCallback((e) => {
    if (e.button !== 0) return;
    if (!isMyTurn || !balls || !cueBall) return;
    if (gamePhase !== 'charging') return;

    cancelAnimationFrame(chargeRaf.current);
    const finalPower = power;
    setPower(0); setGamePhase('animating');

    // Apply velocity to cue ball
    const speed = finalPower * 26;
    const shotBalls = balls.map(b =>
      b.id === 0 ? { ...b, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed } : { ...b }
    );
    casinoAudio.playChip();
    runPhysics(shotBalls);
  }, [isMyTurn, balls, cueBall, gamePhase, power, angle, runPhysics]);

  // Set local game phase when server state changes
  useEffect(() => {
    if (!serverState) return;
    if (serverState.phase === 'game_end') { setGamePhase('ended'); return; }
    if (serverState.phase === 'playing') {
      if (serverState.cueBallInHand && isMyTurn) setGamePhase('placing');
      else if (gamePhase === 'waiting' || gamePhase === 'ended') setGamePhase('aiming');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState?.phase, serverState?.currentTeam, serverState?.cueBallInHand]);

  // Ensure aiming when it becomes my turn
  useEffect(() => {
    if (isMyTurn && (gamePhase === 'waiting')) setGamePhase('aiming');
    if (!isMyTurn && gamePhase === 'aiming') setGamePhase('waiting');
  }, [isMyTurn, gamePhase]);

  const handleJoin = (id, s) => { setRoomId(id); setServerState(s); setView('game'); setErr(''); };

  const handleLeave = async () => {
    cancelAnimationFrame(rafRef.current); cancelAnimationFrame(chargeRaf.current);
    try { await api.billiardsLeaveRoom(roomId); } catch {}
    setView('lobby'); setRoomId(null); setServerState(null); setBalls(null);
  };

  const doStart = async () => {
    try { const r = await api.billiardsStartGame(roomId); setServerState(r.state); } catch(e) { setErr(e.message); }
  };

  const doRematch = async () => {
    try { const r = await api.billiardsRematch(roomId); setServerState(r.state); setGamePhase('waiting'); } catch(e) { setErr(e.message); }
  };

  if (view === 'lobby') return <RoomList onJoin={handleJoin} />;

  const myGroupColor   = myTeam.group === 'solids' ? '#f5c518' : myTeam.group === 'stripes' ? '#1a6bb8' : 'var(--c-text3)';
  const oppGroupColor  = oppTeam.group === 'solids' ? '#f5c518' : oppTeam.group === 'stripes' ? '#1a6bb8' : 'var(--c-text3)';
  const isWaiting      = state.phase === 'waiting';
  const canStart       = isWaiting && players.length >= 2;
  const isGameEnd      = state.phase === 'game_end';
  const iWon           = isGameEnd && state.winner === myTeamIdx;
  const curPlayerName  = players.find(p=>p.userId===curPlayerId)?.username || '';

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ──────────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Billar 8-Ball</div>

        {/* Mode badge */}
        <div style={{ textAlign:'center', fontSize:10, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em', color:'var(--c-text4)' }}>
          {state.mode?.toUpperCase() || '1V1'} · {players.length}/{state.maxPlayers||2} jugadores
        </div>

        {/* Teams */}
        {state.phase === 'playing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[myTeam, oppTeam].map((t, ti) => {
              const isMe = ti === 0;
              const tPlayers = players.filter(p=>p.team===(isMe?myTeamIdx:1-myTeamIdx));
              const gColor = isMe ? myGroupColor : oppGroupColor;
              return (
                <div key={ti} style={{
                  background: 'var(--c-surface2)', borderRadius:10, padding:'10px 12px',
                  border: isMe ? '1px solid rgba(255,45,122,0.25)' : '1px solid var(--c-line2)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:10, fontFamily:'Unbounded,system-ui', fontWeight:700, color: isMe?'var(--c-accent)':'var(--c-text3)', letterSpacing:'0.08em' }}>
                      {isMe ? 'TU EQUIPO' : 'RIVALES'}
                    </span>
                    <span style={{ fontSize:9, fontWeight:700, color:gColor, fontFamily:'Unbounded,system-ui' }}>
                      {t.group ? t.group.toUpperCase() : '?'}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--c-text2)', marginBottom:6 }}>
                    {tPlayers.map(p=>p.username).join(', ')}
                  </div>
                  {/* Pocketed balls */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(t.pocketed||[]).map(id => (
                      <div key={id} style={{
                        width:18, height:18, borderRadius:'50%',
                        background: BCLR[id]||'#fff',
                        border:'1px solid rgba(0,0,0,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:7, fontWeight:800, color: id<=7?'#fff':'transparent',
                      }}>{id}</div>
                    ))}
                    {(t.pocketed||[]).length===0 && <span style={{ fontSize:10, color:'var(--c-text4)' }}>sin bolillas</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Turn status */}
        {state.phase === 'playing' && (
          <div style={{
            borderRadius:8, padding:'10px 12px', textAlign:'center',
            background: isMyTurn ? 'rgba(111,255,125,0.07)' : 'rgba(255,215,0,0.04)',
            border: `1px solid ${isMyTurn ? 'rgba(111,255,125,0.3)' : 'rgba(255,215,0,0.15)'}`,
          }}>
            {isMyTurn ? (
              <>
                <div style={{ fontSize:8, fontFamily:'Unbounded,system-ui', color:'var(--c-accent2)', letterSpacing:'0.1em', marginBottom:4 }}>● TU TURNO</div>
                <div style={{ fontSize:11, color:'var(--c-text2)' }}>
                  {gamePhase==='placing' ? 'Hacé click para colocar la bola blanca' :
                   gamePhase==='charging' ? 'Soltá para disparar' :
                   'Apuntá y mantené presionado para cargar'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:8, fontFamily:'Unbounded,system-ui', color:'#ffd700', letterSpacing:'0.1em', marginBottom:4 }}>TURNO DE</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#ffd700' }}>{curPlayerName}</div>
              </>
            )}
          </div>
        )}

        {/* Power indicator */}
        {isMyTurn && gamePhase === 'charging' && (
          <div>
            <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.08em', marginBottom:6 }}>POTENCIA</div>
            <div style={{ height:8, background:'var(--c-surface3)', borderRadius:4, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:4, transition:'width 0.05s linear',
                width:`${power*100}%`,
                background: power<0.4?'#6fff7d':power<0.7?'#f5c518':'#ff6b35',
              }} />
            </div>
          </div>
        )}

        {/* Game end */}
        {isGameEnd && (
          <div style={{
            borderRadius:10, padding:14, textAlign:'center',
            background: iWon ? 'rgba(111,255,125,0.07)' : 'rgba(255,45,122,0.07)',
            border: `1px solid ${iWon ? 'rgba(111,255,125,0.3)' : 'rgba(255,45,122,0.3)'}`,
          }}>
            <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.1rem', fontWeight:800,
              color: iWon ? 'var(--c-accent2)' : 'var(--c-accent)', marginBottom:6 }}>
              {iWon ? '🏆 ¡GANASTE!' : '💀 PERDISTE'}
            </div>
            <button onClick={doRematch} style={{
              width:'100%', marginTop:8, padding:10, borderRadius:8,
              background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
              border:'none', color:'#fff', fontFamily:'Unbounded,system-ui',
              fontSize:'0.7rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em',
            }}>REVANCHA</button>
          </div>
        )}

        {/* Start */}
        {canStart && <button onClick={doStart} className="roul-spin-btn">EMPEZAR PARTIDA</button>}
        {isWaiting && !canStart && <div style={{ textAlign:'center', color:'var(--c-text3)', fontSize:12 }}>Esperando jugadores… ({players.length}/{state.maxPlayers||2})</div>}

        {err && <div className="casino-err">{err}</div>}

        {/* Footer */}
        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button onClick={()=>setMuted(casinoAudio.toggleMute())} style={{
            width:36, height:36, borderRadius:8, border:'1px solid var(--c-line2)',
            background:'none', color:'var(--c-text3)', cursor:'pointer', fontSize:'1rem',
          }}>{muted?'🔇':'🔊'}</button>
          <button onClick={handleLeave} style={{
            flex:1, background:'none', border:'1px solid var(--c-line2)', borderRadius:8,
            padding:'8px 14px', cursor:'pointer', color:'var(--c-text3)',
            fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
          }}>← Salir</button>
        </div>
      </div>

      {/* ── RIGHT STAGE: CANVAS ─────────────────────────── */}
      <div className="casino-roul-stage" style={{ padding:0, overflow:'hidden', minHeight:520, cursor: isMyTurn && gamePhase==='aiming'?'crosshair': isMyTurn && gamePhase==='placing'?'cell': isMyTurn && gamePhase==='charging'?'none':'default' }}>
        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          style={{ width:'100%', height:'auto', display:'block', userSelect:'none' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={e=>e.preventDefault()}
        />
      </div>
    </div>
  );
}
