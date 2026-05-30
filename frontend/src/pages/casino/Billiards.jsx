import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ── Table dimensions (in metres, like real 9ft pool table) ────────────────────
const T_W      = 2.54;    // playing area width (X axis)
const T_L      = 1.27;    // playing area length (Z axis)
const BALL_R   = 0.029;   // 29mm radius
const BALL_Y   = BALL_R;  // ball center height above felt
const POCKET_R = 0.058;   // pocket sensing radius
const RAIL_H   = 0.06;
const RAIL_T   = 0.06;    // rail thickness
const FELT_Y   = 0;

// Six pockets in XZ plane (corners + side middles)
const POCKETS = [
  [-T_W/2, -T_L/2],[ 0, -T_L/2],[ T_W/2, -T_L/2],
  [-T_W/2,  T_L/2],[ 0,  T_L/2],[ T_W/2,  T_L/2],
];

const BALL_COLORS = [
  '#f5f0e8',                                                       // 0 cue
  '#d4a800','#1455a4','#c0251b','#6b2f9e','#d46000','#197a3a','#7a2e0e','#0a0a0a',  // 1-8
  '#d4a800','#1455a4','#c0251b','#6b2f9e','#d46000','#197a3a','#7a2e0e',            // 9-15 (stripes)
];

// ── Procedural texture for each ball ──────────────────────────────────────────
function makeBallTexture(id) {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');

  if (id === 0) {
    // Cue ball — plain ivory
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Faint red dot (traditional cue-ball mark)
    ctx.fillStyle = '#c93030';
    ctx.beginPath(); ctx.arc(SIZE*0.78, SIZE*0.5, 6, 0, Math.PI*2); ctx.fill();
  } else if (id <= 8) {
    // Solid ball
    ctx.fillStyle = BALL_COLORS[id];
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Two opposite white discs with number
    [0.32, 0.68].forEach(ux => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(SIZE*ux, SIZE*0.5, SIZE*0.18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = id === 8 ? '#0a0a0a' : '#0a0a0a';
      ctx.font = `bold ${SIZE*0.22}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(id), SIZE*ux, SIZE*0.5 + 2);
    });
  } else {
    // Stripe ball: white background, coloured band, white discs with number
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = BALL_COLORS[id];
    ctx.fillRect(0, SIZE*0.28, SIZE, SIZE*0.44);
    [0.32, 0.68].forEach(ux => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(SIZE*ux, SIZE*0.5, SIZE*0.18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = BALL_COLORS[id];
      ctx.font = `bold ${SIZE*0.22}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(id), SIZE*ux, SIZE*0.5 + 2);
    });
  }

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// ── Initial rack (X,Z coordinates around centre 0,0) ──────────────────────────
function initialRack() {
  // Cue ball on the head end (Z negative)
  const balls = [{ id: 0, x: 0, z: -T_L*0.30 }];
  // Triangle apex at Z = +T_L*0.18, growing toward Z = +T_L/2
  const apexZ = T_L*0.18;
  const dRow = BALL_R*2 * Math.cos(Math.PI/6);
  const dCol = BALL_R*2;
  const slots = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col <= row; col++)
      slots.push({ x: -row*BALL_R + col*dCol, z: apexZ + row*dRow });
  const others = [1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for (let i = others.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [others[i],others[j]]=[others[j],others[i]]; }
  const ids = [...others.slice(0,4), 8, ...others.slice(4)];
  slots.forEach((s, i) => balls.push({ id: ids[i], x: s.x, z: s.z }));
  return balls;
}

// ── Ball component (one rigid body) ───────────────────────────────────────────
function Ball({ id, position, registerRef, pocketed }) {
  const ref = useRef(null);
  const texture = useMemo(() => makeBallTexture(id), [id]);

  useEffect(() => {
    if (ref.current) registerRef(id, ref.current);
    return () => registerRef(id, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Hide pocketed balls below the felt
  const initialPos = pocketed ? [position[0], -2, position[2]] : position;

  return (
    <RigidBody
      ref={ref}
      position={initialPos}
      colliders="ball"
      restitution={0.92}
      friction={0.18}
      linearDamping={0.5}
      angularDamping={0.6}
      mass={0.17}
      ccd
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[BALL_R, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.05}
          roughness={0.22}
          envMapIntensity={1.2}
        />
      </mesh>
    </RigidBody>
  );
}

// ── Static cushions (6 wall segments around the felt, gaps at pockets) ────────
function Cushions() {
  // Pocket diameter cuts a gap at each pocket location
  const GAP = POCKET_R * 1.6;
  const halfW = T_W/2, halfL = T_L/2;
  const RAIL_Y = FELT_Y + RAIL_H/2;
  const FRIC = 0.05;
  const REST = 0.78;

  // Long rails: 2 sides × 2 segments per side (split at middle pocket)
  const longSeg = (halfW - GAP) / 2;
  const longCenterOffset = halfW - longSeg/2;

  return (
    <>
      {/* Long rails (along X axis) — top and bottom (+Z / -Z) */}
      {[+1, -1].map((zSign) => (
        <React.Fragment key={`long-${zSign}`}>
          {[+1, -1].map((xSign) => (
            <RigidBody key={xSign} type="fixed" friction={FRIC} restitution={REST}>
              <CuboidCollider
                args={[longSeg/2, RAIL_H/2, RAIL_T/2]}
                position={[xSign * longCenterOffset, RAIL_Y, zSign * (halfL + RAIL_T/2)]}
              />
            </RigidBody>
          ))}
        </React.Fragment>
      ))}

      {/* Short rails (along Z axis) — left and right (+X / -X), one piece each */}
      {[+1, -1].map((xSign) => (
        <RigidBody key={`short-${xSign}`} type="fixed" friction={FRIC} restitution={REST}>
          <CuboidCollider
            args={[RAIL_T/2, RAIL_H/2, (T_L - GAP)/2]}
            position={[xSign * (halfW + RAIL_T/2), RAIL_Y, 0]}
          />
        </RigidBody>
      ))}

      {/* Felt as a ground plane (slightly recessed) */}
      <RigidBody type="fixed" friction={0.45} restitution={0.2}>
        <CuboidCollider args={[T_W/2, 0.05, T_L/2]} position={[0, FELT_Y - 0.05, 0]} />
      </RigidBody>
    </>
  );
}

// ── Visual table (no physics) ─────────────────────────────────────────────────
function TableVisuals() {
  const feltColor = '#1a6840';
  const woodColor = '#4a2e10';

  const RAIL_OUT = 0.13;    // wood width extending beyond playing area
  const RAIL_TOP_H = 0.04;  // wood height above felt
  const SLATE_H   = 0.05;   // slate base depth under felt

  return (
    <>
      {/* Slate base (under the felt — gives the table thickness) */}
      <mesh position={[0, FELT_Y - SLATE_H/2, 0]} receiveShadow>
        <boxGeometry args={[T_W + RAIL_OUT*2, SLATE_H, T_L + RAIL_OUT*2]} />
        <meshStandardMaterial color="#1f0f06" roughness={0.95} />
      </mesh>

      {/* GREEN FELT — large plane covering whole playing area */}
      <mesh receiveShadow position={[0, FELT_Y, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[T_W, T_L]} />
        <meshStandardMaterial color={feltColor} roughness={0.95} />
      </mesh>

      {/* Pocket holes — black circles on the felt */}
      {POCKETS.map(([px, pz], i) => (
        <mesh key={i} position={[px, FELT_Y + 0.001, pz]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[POCKET_R, 28]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      ))}

      {/* Head string line */}
      <mesh position={[0, FELT_Y + 0.0005, -T_L*0.27]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[T_W - 0.05, 0.003]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>

      {/* Wood rails — 4 separate bars around the felt */}
      {/* Long rails (front and back in Z) */}
      {[+1, -1].map(zSign => (
        <mesh
          key={`rail-long-${zSign}`}
          position={[0, RAIL_TOP_H/2, zSign * (T_L/2 + RAIL_OUT/2)]}
          receiveShadow castShadow
        >
          <boxGeometry args={[T_W + RAIL_OUT*2, RAIL_TOP_H, RAIL_OUT]} />
          <meshStandardMaterial color={woodColor} roughness={0.7} />
        </mesh>
      ))}
      {/* Short rails (left and right in X) */}
      {[+1, -1].map(xSign => (
        <mesh
          key={`rail-short-${xSign}`}
          position={[xSign * (T_W/2 + RAIL_OUT/2), RAIL_TOP_H/2, 0]}
          receiveShadow castShadow
        >
          <boxGeometry args={[RAIL_OUT, RAIL_TOP_H, T_L]} />
          <meshStandardMaterial color={woodColor} roughness={0.7} />
        </mesh>
      ))}

      {/* Gold inner trim — thin strip between wood and felt */}
      {[+1, -1].map(zSign => (
        <mesh
          key={`trim-long-${zSign}`}
          position={[0, RAIL_TOP_H + 0.001, zSign * (T_L/2 - 0.002)]}
          rotation={[-Math.PI/2, 0, 0]}
        >
          <planeGeometry args={[T_W + 0.01, 0.008]} />
          <meshBasicMaterial color="#c9963d" />
        </mesh>
      ))}
      {[+1, -1].map(xSign => (
        <mesh
          key={`trim-short-${xSign}`}
          position={[xSign * (T_W/2 - 0.002), RAIL_TOP_H + 0.001, 0]}
          rotation={[-Math.PI/2, 0, Math.PI/2]}
        >
          <planeGeometry args={[T_L + 0.01, 0.008]} />
          <meshBasicMaterial color="#c9963d" />
        </mesh>
      ))}

      {/* Pocket trim — gold rings around each pocket */}
      {POCKETS.map(([px, pz], i) => (
        <mesh key={`pcap-${i}`} position={[px, FELT_Y + 0.0008, pz]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[POCKET_R, POCKET_R + 0.008, 28]} />
          <meshBasicMaterial color="#c9963d" />
        </mesh>
      ))}
    </>
  );
}

// ── Scene contents ────────────────────────────────────────────────────────────
function Scene({ ballState, shootRef, aimAngleRef, hitPosRef, isMyTurnRef, gamePhaseRef, onShotComplete }) {
  const ballRefsMap = useRef(new Map());
  const cueRef = useRef(null);

  const registerRef = useCallback((id, body) => {
    if (body) {
      ballRefsMap.current.set(id, body);
      if (id === 0) cueRef.current = body;
    } else {
      ballRefsMap.current.delete(id);
    }
  }, []);

  // Expose shooting + reset to parent through refs
  useEffect(() => {
    shootRef.current = {
      shoot: (power) => {
        const cb = ballRefsMap.current.get(0);
        if (!cb) return;
        const ang = aimAngleRef.current;
        const hp = hitPosRef.current;

        // Forward in XZ plane, right perpendicular, up = Y
        const forward = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
        const right = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
        const up = new THREE.Vector3(0, 1, 0);

        // Impulse magnitude: power-curve mapped to N·s
        const impulseMag = power*power*1.6 + power*0.45; // soft 0.1 → break 2.05
        const impulse = forward.clone().multiplyScalar(impulseMag);

        // Hit-point offset from ball centre: english (x) + topspin/backspin (-y in UI = +up here)
        const off = right.clone().multiplyScalar(hp.x * BALL_R * 0.85)
          .add(up.clone().multiplyScalar(-hp.y * BALL_R * 0.85));

        const pos = cb.translation();
        const point = { x: pos.x + off.x, y: pos.y + off.y, z: pos.z + off.z };
        cb.wakeUp();
        cb.applyImpulseAtPoint(impulse, point, true);

        casinoAudio.playChip();
      },
      resetRack: (rackBalls) => {
        rackBalls.forEach(b => {
          const body = ballRefsMap.current.get(b.id);
          if (!body) return;
          body.setLinvel({ x:0, y:0, z:0 }, true);
          body.setAngvel({ x:0, y:0, z:0 }, true);
          body.setTranslation({ x: b.x, y: BALL_Y, z: b.z }, true);
          body.setRotation({ x:0, y:0, z:0, w:1 }, true);
        });
      },
      respawnCue: () => {
        const cb = ballRefsMap.current.get(0);
        if (!cb) return;
        cb.setLinvel({ x:0, y:0, z:0 }, true);
        cb.setAngvel({ x:0, y:0, z:0 }, true);
        cb.setTranslation({ x: 0, y: BALL_Y, z: -T_L*0.30 }, true);
      },
    };
  }, [shootRef, aimAngleRef, hitPosRef]);

  // Force render tick to redraw aim line during animation
  useFrame((_state, dt) => {
    const phase = gamePhaseRef.current;
    if (phase !== 'animating') return;

    // Check if all balls stopped + handle pocketing
    let allStopped = true;
    const pocketedThisFrame = [];
    for (const [id, body] of ballRefsMap.current) {
      const v = body.linvel();
      const av = body.angvel();
      const speed = Math.hypot(v.x, v.y, v.z);
      const angSpeed = Math.hypot(av.x, av.y, av.z);
      if (speed > 0.04 || angSpeed > 0.3) allStopped = false;

      // Pocket detection
      const p = body.translation();
      if (p.y > FELT_Y - 0.05 && p.y < FELT_Y + BALL_R*2) {
        for (const [px, pz] of POCKETS) {
          const dx = p.x - px, dz = p.z - pz;
          if (dx*dx + dz*dz < POCKET_R*POCKET_R) {
            pocketedThisFrame.push(id);
            // Move below the table so it stops interfering
            body.setLinvel({ x:0, y:0, z:0 }, true);
            body.setAngvel({ x:0, y:0, z:0 }, true);
            body.setTranslation({ x: px, y: -2, z: pz }, true);
            break;
          }
        }
      }
    }

    if (pocketedThisFrame.length) onShotComplete.pocketed(pocketedThisFrame);
    if (allStopped) onShotComplete.complete();
  });

  return (
    <>
      {/* Lights — top-down view needs broader fill */}
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[0.4, 4, 0.3]} intensity={1.1} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-1.6} shadow-camera-right={1.6}
        shadow-camera-top={1.0} shadow-camera-bottom={-1.0}
        shadow-bias={-0.0005}
      />
      {/* Fill lights from side to highlight ball curvature */}
      <directionalLight position={[-2, 1.5, 0]} intensity={0.35} />
      <directionalLight position={[2, 1.5, 0]} intensity={0.35} />

      <TableVisuals />
      <Cushions />

      {ballState.map(b => (
        <Ball
          key={b.id}
          id={b.id}
          position={[b.x, BALL_Y, b.z]}
          registerRef={registerRef}
          pocketed={b.pocketed}
        />
      ))}

      {/* Aim and cue dynamically updated each frame via refs */}
      <DynamicAimAndCue cueRef={cueRef} aimAngleRef={aimAngleRef} gamePhaseRef={gamePhaseRef} isMyTurnRef={isMyTurnRef} />
    </>
  );
}

// Wrapper to keep aim and cue rendering reactive each frame
function DynamicAimAndCue({ cueRef, aimAngleRef, gamePhaseRef, isMyTurnRef }) {
  const aimRef = useRef(null);
  const ghostRef = useRef(null);
  const stickRef = useRef(null);
  const powerRefLocal = useRef(0);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const fromVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dirVec  = useMemo(() => new THREE.Vector3(), []);

  // Bind to global power changes
  useEffect(() => {
    window.__poolPowerRef = powerRefLocal;
    return () => { delete window.__poolPowerRef; };
  }, []);

  useFrame(() => {
    const ph = gamePhaseRef.current;
    const imt = isMyTurnRef.current;

    const showAim = imt && (ph === 'aiming' || ph === 'charging');
    if (aimRef.current)   aimRef.current.visible = showAim;
    if (ghostRef.current) ghostRef.current.visible = showAim;
    if (stickRef.current) stickRef.current.visible = showAim;
    if (!showAim || !cueRef.current) return;

    const cb = cueRef.current.translation();
    const ang = aimAngleRef.current;
    const pwr = powerRefLocal.current;

    const dx = Math.cos(ang), dz = Math.sin(ang);

    // Aim line — plane laid flat (XZ), rotated to align with shot direction
    const aimLen = 3.0;
    aimRef.current.position.set(cb.x + dx*aimLen/2, FELT_Y + 0.004, cb.z + dz*aimLen/2);
    aimRef.current.rotation.set(-Math.PI/2, -ang, 0);
    aimRef.current.scale.set(aimLen, 1, 1);

    // Ghost ball ~0.4m forward
    ghostRef.current.position.set(cb.x + dx*0.4, BALL_Y, cb.z + dz*0.4);

    // Cue stick — laid horizontally along aim direction
    const pullback = pwr*pwr*0.18 + pwr*0.04;
    const stickLen = 1.3;
    const distFromBall = BALL_R + 0.02 + pullback;
    const cx = cb.x - dx * (distFromBall + stickLen/2);
    const cz = cb.z - dz * (distFromBall + stickLen/2);
    stickRef.current.position.set(cx, BALL_Y + 0.004, cz);
    // Rotate cylinder's default Y axis to point along (dx, 0, dz)
    dirVec.set(dx, 0, dz);
    tmpQuat.setFromUnitVectors(fromVec, dirVec);
    stickRef.current.quaternion.copy(tmpQuat);
  });

  return (
    <>
      <mesh ref={aimRef} visible={false}>
        <planeGeometry args={[1, 0.005]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={ghostRef} visible={false}>
        <sphereGeometry args={[BALL_R*1.05, 20, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} wireframe />
      </mesh>
      <mesh ref={stickRef} visible={false} castShadow>
        <cylinderGeometry args={[0.009, 0.015, 1.3, 14]} />
        <meshStandardMaterial color="#c9a55a" roughness={0.42} metalness={0.12} />
      </mesh>
    </>
  );
}

// ── Cue Ball Hit Position Selector (2D UI, unchanged from prior version) ──────
function CueBallControl({ hitPos, onChange, disabled }) {
  const SIZE = 52, ref = useRef(null);
  const dragging = useRef(false);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const update = useCallback((e) => {
    if (disabledRef.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) - SIZE) / SIZE;
    let y = ((e.clientY - rect.top) - SIZE) / SIZE;
    const len = Math.sqrt(x*x + y*y);
    const maxR = 0.88;
    if (len > maxR) { x = x/len*maxR; y = y/len*maxR; }
    onChangeRef.current({ x, y });
  }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    const move = (e) => { if (dragging.current) update(e); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [update]);

  const label = () => {
    const { x, y } = hitPos;
    if (Math.abs(x) < 0.18 && Math.abs(y) < 0.18) return 'Centro';
    if (y < -0.3 && Math.abs(x) < 0.35) return '▲ Topspin';
    if (y > 0.3 && Math.abs(x) < 0.35) return '▼ Retro';
    if (x < -0.3 && Math.abs(y) < 0.35) return '◄ Efecto izq.';
    if (x > 0.3 && Math.abs(y) < 0.35) return '► Efecto der.';
    return 'Efecto combo';
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center' }}>
      <div style={{ fontSize:8, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
        Punto de golpe
      </div>
      <div
        ref={ref}
        onMouseDown={e => { if(!disabled){ dragging.current=true; update(e); } }}
        onClick={e => { if(!disabled) update(e); }}
        style={{
          width:SIZE*2, height:SIZE*2, borderRadius:'50%', position:'relative',
          background:'radial-gradient(circle at 38% 35%, #f5f0e8 0%, #c8bb96 60%, #a89870 100%)',
          border:'2px solid rgba(255,255,255,0.18)',
          boxShadow:'0 0 0 1px rgba(0,0,0,0.4),inset 0 0 18px rgba(0,0,0,0.18)',
          cursor: disabled ? 'default' : 'crosshair', userSelect:'none',
        }}
      >
        <div style={{ position:'absolute', top:'12%', left:'14%', width:'30%', height:'25%', borderRadius:'50%', background:'radial-gradient(rgba(255,255,255,0.7),rgba(255,255,255,0))', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:'50%', top:'8%', bottom:'8%', width:1, background:'rgba(0,0,0,0.15)', transform:'translateX(-50%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:'8%', right:'8%', height:1, background:'rgba(0,0,0,0.15)', transform:'translateY(-50%)', pointerEvents:'none' }} />
        {[['T',50,6],['B',50,80],['L',6,50],['R',80,50]].map(([l,lx,ly]) => (
          <div key={l} style={{ position:'absolute', left:`${lx}%`, top:`${ly}%`, transform:'translate(-50%,-50%)', fontSize:7, color:'rgba(0,0,0,0.35)', fontFamily:'Inter,system-ui', pointerEvents:'none', fontWeight:700 }}>{l}</div>
        ))}
        <div style={{
          position:'absolute',
          left: `calc(50% + ${hitPos.x*(SIZE-9)}px - 5px)`,
          top:  `calc(50% + ${hitPos.y*(SIZE-9)}px - 5px)`,
          width:10, height:10, borderRadius:'50%',
          background:'#ff2d7a', boxShadow:'0 0 7px rgba(255,45,122,0.8)',
          border:'1.5px solid #fff', pointerEvents:'none',
          transition:'left 0.04s, top 0.04s',
        }} />
      </div>
      <div style={{ fontSize:9, color:'var(--c-accent)', fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.05em' }}>
        {label()}
      </div>
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function RoomList({ onJoin, onSolo }) {
  const [rooms, setRooms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState('1v1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = () => api.billiardsGetRooms().then(setRooms).catch(()=>{});
    load(); const iv = setInterval(load, 3000); return () => clearInterval(iv);
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      const room = await api.billiardsCreateRoom({ name: name || 'Mesa Billar', mode });
      await api.billiardsJoinRoom(room.id).catch(()=>{});
      const r = await api.billiardsGetRoom(room.id);
      onJoin(room.id, r.state);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const join = async (id) => {
    setLoading(true);
    try { await api.billiardsJoinRoom(id); const r = await api.billiardsGetRoom(id); onJoin(id, r.state); }
    catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.3rem', fontWeight:800, color:'#fff', marginBottom:24 }}>
        🎱 Billar <span style={{ color:'var(--c-accent)' }}>3D · 8-Ball</span>
      </div>

      <button onClick={onSolo} style={{ width:'100%', padding:12, marginBottom:10, borderRadius:10, background:'rgba(111,255,125,0.1)', border:'1px solid rgba(111,255,125,0.35)', color:'var(--c-accent2)', fontFamily:'Unbounded,system-ui', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em' }}>
        🎱 PRÁCTICA SOLO — sin servidor
      </button>

      {!creating ? (
        <button onClick={() => setCreating(true)} style={{ width:'100%', padding:12, marginBottom:20, borderRadius:10, background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)', border:'none', color:'#fff', fontFamily:'Unbounded,system-ui', fontSize:'0.75rem', fontWeight:700, cursor:'pointer' }}>
          + CREAR MESA MULTIJUGADOR
        </button>
      ) : (
        <div style={{ background:'var(--c-surface)', border:'1px solid rgba(255,45,122,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la mesa"
              style={{ background:'var(--c-bg1)', border:'1px solid var(--c-line2)', borderRadius:8, padding:'10px 14px', color:'#fff', fontFamily:'Inter,system-ui' }} />
            <div style={{ display:'flex', gap:8 }}>
              {['1v1','2v2'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex:1, padding:10, borderRadius:8,
                  background: mode===m ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                  border: `1px solid ${mode===m ? 'rgba(255,45,122,0.4)' : 'var(--c-line2)'}`,
                  color: mode===m ? '#ff2d7a' : 'var(--c-text3)',
                  fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                }}>{m}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={create} disabled={loading} style={{ flex:1, padding:10, borderRadius:8, background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)', border:'none', color:'#fff', fontWeight:700, cursor:'pointer' }}>
                Crear y Entrar
              </button>
              <button onClick={() => setCreating(false)} style={{ padding:'10px 14px', borderRadius:8, background:'var(--c-surface2)', border:'1px solid var(--c-line2)', color:'var(--c-text3)', cursor:'pointer' }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {rooms.length === 0 && !creating && <div style={{ textAlign:'center', color:'var(--c-text3)', padding:'40px 0', fontSize:14 }}>No hay mesas activas. ¡Creá una!</div>}

      {rooms.map(r => {
        const s = r.state || {};
        const cnt = s.players?.length || 0, isFull = cnt >= (s.maxPlayers||2), isPlaying = s.phase === 'playing';
        return (
          <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', marginBottom:10, background:'var(--c-surface)', border:'1px solid var(--c-line2)', borderRadius:12 }}>
            <div>
              <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{s.name||'Mesa Billar'} <span style={{ color:'var(--c-text4)', fontSize:11 }}>· {s.mode||'1v1'}</span></div>
              <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>{cnt}/{s.maxPlayers||2} jugadores · {isPlaying?'En juego':'Esperando'}</div>
            </div>
            <button disabled={isFull||isPlaying||loading} onClick={() => join(r.id)} style={{
              padding:'8px 16px', borderRadius:8,
              background: (isFull||isPlaying) ? 'var(--c-surface2)' : 'rgba(255,45,122,0.12)',
              border: `1px solid ${(isFull||isPlaying) ? 'var(--c-line2)' : 'rgba(255,45,122,0.4)'}`,
              color: (isFull||isPlaying) ? 'var(--c-text4)' : '#ff2d7a',
              fontWeight:700, fontSize:'0.75rem', cursor:(isFull||isPlaying)?'not-allowed':'pointer',
            }}>{isPlaying?'En juego':isFull?'Llena':'Unirse →'}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Billiards({ user }) {
  const [view, setView]           = useState('lobby');
  const [roomId, setRoomId]       = useState(null);
  const [serverState, setServerState] = useState(null);
  const [ballState, setBallState] = useState(null);   // initial positions for scene
  const [gamePhaseUI, setGamePhaseUI] = useState('waiting');
  const [angle, setAngle]         = useState(0);
  const [power, setPower]         = useState(0);
  const [hitPos, setHitPos]       = useState({ x:0, y:0 });
  const [err, setErr]             = useState('');
  const [muted, setMuted]         = useState(casinoAudio.muted);
  const [soloPocketed, setSoloPocketed] = useState([]);
  const [pocketedSet, setPocketedSet] = useState(new Set());

  // Refs for fast access during r3f frames + mouse handlers
  const gamePhaseRef = useRef('waiting');
  const aimAngleRef  = useRef(0);
  const powerRef     = useRef(0);
  const hitPosRef    = useRef({ x:0, y:0 });
  const isMyTurnRef  = useRef(false);
  const shootRef     = useRef(null);   // { shoot, resetRack, respawnCue }
  const chargeRaf    = useRef(null);
  const chargeStart  = useRef(null);
  const isSoloRef    = useRef(false);

  const setGamePhase = useCallback((p) => { gamePhaseRef.current = p; setGamePhaseUI(p); }, []);

  // Sync UI angle → ref
  useEffect(() => { aimAngleRef.current = angle; }, [angle]);
  useEffect(() => { hitPosRef.current  = hitPos; }, [hitPos]);
  useEffect(() => { powerRef.current   = power; if (window.__poolPowerRef) window.__poolPowerRef.current = power; }, [power]);

  // Multiplayer polling
  useEffect(() => {
    if (!roomId || view !== 'game') return;
    const poll = async () => { try { const r = await api.billiardsGetRoom(roomId); setServerState(r.state); } catch {} };
    poll(); const iv = setInterval(poll, 2000); return () => clearInterval(iv);
  }, [roomId, view]);

  // Set initial rack when scene starts
  useEffect(() => {
    if (view === 'solo' && !ballState) {
      setBallState(initialRack());
      setSoloPocketed([]);
      setPocketedSet(new Set());
    }
    if (view === 'game' && serverState?.balls && !ballState) {
      // Convert server (felt-space X,Y) to 3D (X,Z) — approximate
      const arr = serverState.balls.map(b => ({
        id: b.id,
        x: (b.x - 808/2) / 808 * T_W,
        z: (b.y - 380/2) / 380 * T_L,
        pocketed: b.pocketed,
      }));
      setBallState(arr);
    }
  }, [view, serverState, ballState]);

  const isSolo = view === 'solo';
  isSoloRef.current = isSolo;

  // Derive turn info
  const state = serverState || {};
  const players = state.players || [], teams = state.teams || [];
  const myTeamIdx = players.find(p => p.userId === user.id)?.team ?? -1;
  const myTeam = teams[myTeamIdx] || { playerIds:[], group:null, pocketed:[] };
  const oppTeam = teams[1-myTeamIdx] || { playerIds:[], group:null, pocketed:[] };
  const curTeam = teams[state.currentTeam] || { playerIds:[] };
  const curPlayerId = curTeam.playerIds[state.currentPlayerInTeam % Math.max(1, curTeam.playerIds.length)];
  const curPlayerName = players.find(p => p.userId === curPlayerId)?.username || '';

  const gamePhase = gamePhaseUI;
  const isMyTurn = isSolo
    ? gamePhase !== 'animating'
    : (curPlayerId === user.id && state.phase === 'playing' && gamePhase !== 'animating');
  isMyTurnRef.current = isMyTurn;

  // ── Mouse on Canvas: aim by moving mouse, hold to charge, release to shoot ──
  const canvasContainerRef = useRef(null);

  const onSceneMouseMove = useCallback((e) => {
    if (!isMyTurnRef.current) return;
    if (gamePhaseRef.current !== 'aiming') return;
    // Map mouse position to a world ray and compute angle from cue ball
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    // Top-down view at y=2.05, FOV=46. Visible area ≈ 2.73m × 1.74m
    // Map normalized screen coords to world XZ plane (camera.up = -Z so screen-y → world+Z)
    const targetX = nx * 1.4;
    const targetZ = -ny * 0.9;
    const cueX = ballState?.find(b => b.id === 0)?.x ?? 0;
    const cueZ = ballState?.find(b => b.id === 0)?.z ?? -T_L*0.3;
    // Use actual cue position via shootRef if we can get it
    const ang = Math.atan2(targetZ - cueZ, targetX - cueX);
    aimAngleRef.current = ang; setAngle(ang);
  }, [ballState]);

  const onSceneMouseDown = useCallback((e) => {
    if (e.button !== 0 || !isMyTurnRef.current) return;
    if (gamePhaseRef.current !== 'aiming') return;
    setGamePhase('charging');
    powerRef.current = 0; setPower(0);
    chargeStart.current = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - chargeStart.current) / 2200);
      powerRef.current = p; setPower(p);
      chargeRaf.current = requestAnimationFrame(tick);
    };
    chargeRaf.current = requestAnimationFrame(tick);
  }, [setGamePhase]);

  const onSceneMouseUp = useCallback((e) => {
    if (e.button !== 0 || !isMyTurnRef.current) return;
    if (gamePhaseRef.current !== 'charging') return;
    cancelAnimationFrame(chargeRaf.current);
    const p = powerRef.current;
    powerRef.current = 0; setPower(0);
    setGamePhase('animating');
    setPocketedSet(new Set()); // reset per shot
    shootRef.current?.shoot(p);
  }, [setGamePhase]);

  // ── Shot complete handlers (called from inside Canvas via shootRef wiring) ──
  const handleShotComplete = useMemo(() => ({
    pocketed: (ids) => {
      setPocketedSet(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
    },
    complete: () => {
      // Use the latest pocketedSet via functional set
      setPocketedSet(prev => {
        const pocketed = [...prev];
        const foulCue = pocketed.includes(0);

        if (isSoloRef.current) {
          if (foulCue) {
            shootRef.current?.respawnCue();
          }
          setSoloPocketed(p => [...new Set([...p, ...pocketed.filter(id => id !== 0)])]);
          setGamePhase('aiming');
        } else {
          // Send to server
          const finalBalls = ballState?.map(b => ({ id:b.id, x:b.x, y:b.z, pocketed: pocketed.includes(b.id) || b.pocketed })) || [];
          api.billiardsShot(roomId, { balls: finalBalls, pocketedThisShot: pocketed, foulCueBall: foulCue })
            .then(r => { setServerState(r.state); if (foulCue) setGamePhase('placing'); else setGamePhase('waiting'); })
            .catch(e => setErr(e.message));
        }
        return new Set();
      });
    },
  }), [ballState, roomId, setGamePhase]);

  // Auto-set phase to 'aiming' when it becomes my turn (multiplayer)
  useEffect(() => {
    if (isSolo) return;
    if (isMyTurn && (gamePhaseRef.current === 'waiting' || gamePhaseRef.current === 'ended')) {
      setGamePhase('aiming');
    }
    if (!isMyTurn && gamePhaseRef.current === 'aiming') setGamePhase('waiting');
  }, [isMyTurn, isSolo, setGamePhase]);

  // ── View transitions ──
  const handleJoin = (id, s) => { setRoomId(id); setServerState(s); setView('game'); setErr(''); };
  const handleLeave = () => {
    cancelAnimationFrame(chargeRaf.current);
    if (!isSoloRef.current) api.billiardsLeaveRoom(roomId).catch(()=>{});
    setView('lobby'); setRoomId(null); setServerState(null); setBallState(null);
    setGamePhase('waiting'); powerRef.current = 0; setPower(0);
  };
  const startSolo = () => {
    setBallState(initialRack()); setSoloPocketed([]); setPocketedSet(new Set());
    setView('solo'); setGamePhase('aiming');
  };
  const resetSolo = () => {
    const fresh = initialRack();
    setBallState(fresh); setSoloPocketed([]); setPocketedSet(new Set());
    setGamePhase('aiming');
    // Also tell scene to reset rigid body positions
    shootRef.current?.resetRack(fresh);
  };

  const handleHitPosChange = useCallback((p) => { hitPosRef.current = p; setHitPos(p); }, []);

  if (view === 'lobby') return <RoomList onJoin={handleJoin} onSolo={startSolo} />;

  const isWaiting = !isSolo && state.phase === 'waiting';
  const isGameEnd = !isSolo && state.phase === 'game_end';
  const iWon = isGameEnd && state.winner === myTeamIdx;
  const canStart = isWaiting && players.length >= 2;
  const doStart = async () => { try { const r = await api.billiardsStartGame(roomId); setServerState(r.state); setBallState(null); } catch (e) { setErr(e.message); } };
  const doRematch = async () => { try { const r = await api.billiardsRematch(roomId); setServerState(r.state); setBallState(null); setGamePhase('waiting'); } catch (e) { setErr(e.message); } };

  return (
    <div className="casino-roul-view">
      {/* ── LEFT PANEL ── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Billar 3D 8-Ball</div>
        <div style={{ textAlign:'center', fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em', color:'var(--c-text4)' }}>
          {isSolo ? 'PRÁCTICA SOLO' : `${state.mode?.toUpperCase()||'1V1'} · ${players.length}/${state.maxPlayers||2} jugadores`}
        </div>

        {isSolo && soloPocketed.length > 0 && (
          <div style={{ background:'var(--c-surface2)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.08em', marginBottom:6 }}>EMBOCADAS</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              {soloPocketed.map(id => (
                <div key={id} style={{ width:16, height:16, borderRadius:'50%', background:BALL_COLORS[id]||'#fff', border:'1px solid rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:6, fontWeight:800, color:'#fff' }}>{id}</div>
              ))}
            </div>
          </div>
        )}

        {!isSolo && state.phase === 'playing' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[{ t:myTeam, isMe:true }, { t:oppTeam, isMe:false }].map(({ t, isMe }) => (
              <div key={isMe?'me':'opp'} style={{ background:'var(--c-surface2)', borderRadius:10, padding:'10px 12px', border: isMe ? '1px solid rgba(255,45,122,0.25)' : '1px solid var(--c-line2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, color:isMe?'var(--c-accent)':'var(--c-text3)', letterSpacing:'0.08em' }}>{isMe?'TU EQUIPO':'RIVALES'}</span>
                  <span style={{ fontSize:9, fontWeight:700, color: t.group==='solids'?'#f5c518':t.group==='stripes'?'#4a90e2':'var(--c-text4)', fontFamily:'Unbounded,system-ui' }}>{t.group ? t.group.toUpperCase() : '?'}</span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                  {(t.pocketed||[]).map(id => (
                    <div key={id} style={{ width:16, height:16, borderRadius:'50%', background:BALL_COLORS[id]||'#fff', border:'1px solid rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:6, fontWeight:800, color:'#fff' }}>{id}</div>
                  ))}
                  {(t.pocketed||[]).length === 0 && <span style={{ fontSize:9, color:'var(--c-text4)' }}>sin bolillas</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {isMyTurn && gamePhase === 'aiming' && (
          <CueBallControl hitPos={hitPos} onChange={handleHitPosChange} disabled={false} />
        )}

        {(isSolo || state.phase === 'playing') && (
          <div style={{ borderRadius:8, padding:'10px 12px', textAlign:'center', background: isMyTurn ? 'rgba(111,255,125,0.07)' : 'rgba(255,215,0,0.04)', border: `1px solid ${isMyTurn ? 'rgba(111,255,125,0.3)' : 'rgba(255,215,0,0.15)'}` }}>
            {isMyTurn ? (
              <>
                <div style={{ fontSize:8, fontFamily:'Unbounded,system-ui', color:'var(--c-accent2)', letterSpacing:'0.1em', marginBottom:4 }}>
                  {isSolo ? '● PRÁCTICA LIBRE' : '● TU TURNO'}
                </div>
                <div style={{ fontSize:11, color:'var(--c-text2)' }}>
                  {gamePhase === 'charging' ? '¡Soltá para disparar!' : 'Apuntá con el mouse · mantené para cargar'}
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

        {isMyTurn && gamePhase === 'charging' && (
          <div>
            <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.08em', marginBottom:6 }}>POTENCIA</div>
            <div style={{ height:8, background:'var(--c-surface3)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, width:`${power*100}%`, background: power<0.4?'#6fff7d':power<0.7?'#f5c518':'#ff6b35' }} />
            </div>
          </div>
        )}

        {isSolo && <button onClick={resetSolo} style={{ width:'100%', padding:10, borderRadius:8, background:'rgba(111,255,125,0.08)', border:'1px solid rgba(111,255,125,0.3)', color:'var(--c-accent2)', fontFamily:'Unbounded,system-ui', fontSize:'0.7rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em' }}>↺ NUEVA MESA</button>}

        {isGameEnd && (
          <div style={{ borderRadius:10, padding:14, textAlign:'center', background: iWon ? 'rgba(111,255,125,0.07)' : 'rgba(255,45,122,0.07)', border: `1px solid ${iWon ? 'rgba(111,255,125,0.3)' : 'rgba(255,45,122,0.3)'}` }}>
            <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.1rem', fontWeight:800, color: iWon?'var(--c-accent2)':'var(--c-accent)', marginBottom:8 }}>
              {iWon ? '🏆 ¡GANASTE!' : '💀 PERDISTE'}
            </div>
            <button onClick={doRematch} style={{ width:'100%', padding:10, borderRadius:8, background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)', border:'none', color:'#fff', fontFamily:'Unbounded,system-ui', fontSize:'0.7rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em' }}>REVANCHA</button>
          </div>
        )}

        {canStart && <button onClick={doStart} className="roul-spin-btn">EMPEZAR PARTIDA</button>}
        {isWaiting && !canStart && <div style={{ textAlign:'center', color:'var(--c-text3)', fontSize:12 }}>Esperando jugadores… ({players.length}/{state.maxPlayers||2})</div>}
        {err && <div className="casino-err">{err}</div>}

        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button onClick={() => setMuted(casinoAudio.toggleMute())} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--c-line2)', background:'none', color:'var(--c-text3)', cursor:'pointer', fontSize:'1rem' }}>{muted?'🔇':'🔊'}</button>
          <button onClick={handleLeave} style={{ flex:1, background:'none', border:'1px solid var(--c-line2)', borderRadius:8, padding:'8px 14px', cursor:'pointer', color:'var(--c-text3)', fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem' }}>← Salir</button>
        </div>
      </div>

      {/* ── 3D CANVAS STAGE — custom container, NOT casino-roul-stage flex (which centers/shrinks) ── */}
      <div
        ref={canvasContainerRef}
        style={{
          position:'relative', width:'100%',
          aspectRatio:'1.85 / 1',     // ≈ table proportions, fills stage width naturally
          minHeight:520, maxHeight:780,
          background:'linear-gradient(to bottom, #0a0a14 0%, #1a0f1f 100%)',
          borderRadius:12, overflow:'hidden', border:'1px solid var(--c-line2)',
        }}
        onMouseMove={onSceneMouseMove}
        onMouseDown={onSceneMouseDown}
        onMouseUp={onSceneMouseUp}
        onContextMenu={e => e.preventDefault()}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position:[0, 2.05, 0.001], fov:46, near:0.05, far:50 }}
          onCreated={({ camera }) => {
            camera.up.set(0, 0, -1);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
          }}
          style={{ position:'absolute', inset:0, display:'block' }}
          gl={{ antialias:true, alpha:false }}
        >
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]} timeStep={1/120}>
              {ballState && (
                <Scene
                  ballState={ballState}
                  shootRef={shootRef}
                  aimAngleRef={aimAngleRef}
                  hitPosRef={hitPosRef}
                  isMyTurnRef={isMyTurnRef}
                  gamePhaseRef={gamePhaseRef}
                  onShotComplete={handleShotComplete}
                />
              )}
            </Physics>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
