import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const numberColor = n => {
  if (n === '0' || n === '00' || n === 0) return 'green';
  return RED_NUMS.has(parseInt(n)) ? '#ff4466' : '#3a3a5a';
};

// American sequence
const WHEEL_NUMBERS = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1',
  '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'
];

function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);

  const wheelAngleRef = useRef(0);
  const ballAngleRef  = useRef(null); // null = no ball shown
  const ballRadiusRef = useRef(null);

  // 'idle' | 'spinning' | 'landing' | 'settled'
  const ballStateRef = useRef('idle');

  // Landing animation (time-based, pre-computed trajectory)
  const landingStartTimeRef  = useRef(0);
  const landingStartAngleRef = useRef(0);
  const landingTotalDeltaRef = useRef(0);
  const landingTargetRelRef  = useRef(0);

  // Relative angle to wheel center (used in settled state)
  const relAngleRef = useRef(0);

  const lastTickPocketRef = useRef(-1);
  const rollSoundRef      = useRef(null);
  const onSpinCalledRef   = useRef(false);
  const animRef           = useRef(null);

  const resultRef         = useRef(result);
  const onSpinCompleteRef = useRef(onSpinComplete);

  useEffect(() => { resultRef.current = result; },           [result]);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; }, [onSpinComplete]);

  const N          = 38;
  const wheelSpeed = 0.012;
  const BALL_SPEED = -0.22;          // rad/frame, counter-clockwise
  const LANDING_MS = 4000;
  const canvasW    = 380;
  const cx         = canvasW / 2;    // 190
  const cy         = canvasW / 2;    // 190
  const R          = cx - 18;        // 172
  const OUTER_R    = R + 4;          // 176 — rim track
  const POCKET_R   = R - 14;         // 158 — pocket bottom

  // Kick off spin
  useEffect(() => {
    if (spinning && result === null) {
      ballStateRef.current    = 'spinning';
      ballAngleRef.current    = Math.PI;
      ballRadiusRef.current   = OUTER_R;
      onSpinCalledRef.current = false;
      lastTickPocketRef.current = -1;
      if (rollSoundRef.current) { rollSoundRef.current.stop(); rollSoundRef.current = null; }
      rollSoundRef.current = casinoAudio.playRouletteRoll();
    }
  }, [spinning, result]);

  // Pre-compute full landing trajectory when result arrives
  useEffect(() => {
    if (result === null || ballStateRef.current !== 'spinning') return;

    const arc          = (2 * Math.PI) / N;
    const targetIdx    = WHEEL_NUMBERS.indexOf(String(result));
    const targetRelAng = (targetIdx + 0.5) * arc - Math.PI / 2;

    // Wheel angle at the moment the landing animation finishes
    const framesAhead    = (LANDING_MS / 1000) * 60;
    const wheelAtLanding = wheelAngleRef.current + framesAhead * wheelSpeed;
    const targetAbsAng   = wheelAtLanding + targetRelAng;

    // Ball travels counter-clockwise (negative delta) from current angle
    let delta = targetAbsAng - ballAngleRef.current;
    delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // [0, 2π)
    delta -= 2 * Math.PI;                                               // (-2π, 0]
    delta -= (2 * Math.PI) * (2 + Math.floor(Math.random() * 2));      // 2–3 extra revs

    landingStartAngleRef.current = ballAngleRef.current;
    landingTotalDeltaRef.current = delta;
    landingTargetRelRef.current  = targetRelAng;
    landingStartTimeRef.current  = performance.now();

    ballStateRef.current = 'landing';
    if (rollSoundRef.current) rollSoundRef.current.setSpeed(0.65);
  }, [result]);

  const draw = (wheelRotDeg, ballAngleRad, ballRadiusPx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvasW, canvasW);
    const arc    = (2 * Math.PI) / N;
    const rotRad = (wheelRotDeg * Math.PI) / 180;

    // Outer wood rim
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, 2 * Math.PI);
    ctx.fillStyle   = '#2f1f17';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Wheel sectors + dividers + numbers
    for (let i = 0; i < N; i++) {
      const n     = WHEEL_NUMBERS[i];
      const start = rotRad + i * arc - Math.PI / 2;
      const end   = rotRad + (i + 1) * arc - Math.PI / 2;
      const mid   = rotRad + (i + 0.5) * arc - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = n === '0' || n === '00' ? '#1a5c1a' : RED_NUMS.has(parseInt(n)) ? '#8b1a2a' : '#1a1a2a';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + (R - 20) * Math.cos(start), cy + (R - 20) * Math.sin(start));
      ctx.lineTo(cx + R * Math.cos(start), cy + R * Math.sin(start));
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth   = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillStyle     = '#e0e0f0';
      ctx.font          = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign     = 'right';
      ctx.textBaseline  = 'middle';
      ctx.fillText(n, R - 5, 0);
      ctx.restore();
    }

    // Pocket borders
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.beginPath(); ctx.arc(cx, cy, R - 20, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();

    // Outer rim track
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#4a4a5a'; ctx.lineWidth = 4; ctx.stroke();

    // Brass spindle
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ffd700'); g.addColorStop(1, '#8b6508');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5; ctx.stroke();

    // Rotating arms
    for (let j = 0; j < 4; j++) {
      const ha = rotRad + j * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 34 * Math.cos(ha), cy + 34 * Math.sin(ha));
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 34 * Math.cos(ha), cy + 34 * Math.sin(ha), 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffd700'; ctx.fill();
    }

    // Ball
    if (ballAngleRad !== null && ballRadiusPx !== null) {
      const bx = cx + ballRadiusPx * Math.cos(ballAngleRad);
      const by = cy + ballRadiusPx * Math.sin(ballAngleRad);
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, 2 * Math.PI);
      const bg = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 8);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.7, '#e4e4e4'); bg.addColorStop(1, '#9c9c9c');
      ctx.fillStyle   = bg;
      ctx.shadowColor = 'rgba(255,255,255,0.85)';
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.restore();
    }
  };

  // Main animation loop — pure time-based, no accumulating physics state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasW * dpr;
    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const easeInCubic  = t => t * t * t;
    const arc = (2 * Math.PI) / N;

    const tick = (now) => {
      wheelAngleRef.current += wheelSpeed;
      const rotDeg = (wheelAngleRef.current * 180) / Math.PI;
      const state  = ballStateRef.current;

      if (state === 'spinning') {
        ballAngleRef.current  += BALL_SPEED;
        ballRadiusRef.current  = OUTER_R;
        if (rollSoundRef.current) rollSoundRef.current.setSpeed(1.0);

      } else if (state === 'landing') {
        const elapsed = now - landingStartTimeRef.current;
        const t       = Math.min(elapsed / LANDING_MS, 1.0);
        const eased   = easeOutQuart(t);

        // Angular: ease from start to target (includes extra full revolutions)
        ballAngleRef.current = landingStartAngleRef.current + landingTotalDeltaRef.current * eased;

        // Radial: stay on outer rim until 55% done, then spiral smoothly into pocket
        const tR      = Math.max(0, (t - 0.55) / 0.45);
        const rEased  = easeInCubic(tR);
        const base    = OUTER_R + (POCKET_R - OUTER_R) * rEased;
        // Fading oscillation gives the illusion of bouncing off pocket frets
        const wiggle  = Math.sin(t * 40) * 2.5 * Math.max(0, 1 - t * 1.4);
        ballRadiusRef.current = base + wiggle;

        // Roll sound fades with deceleration
        if (rollSoundRef.current) {
          rollSoundRef.current.setSpeed(Math.max(0.05, 1.0 - eased));
        }

        // Tick sounds while ball is still on the outer rim
        if (t < 0.7) {
          const rel    = ballAngleRef.current - wheelAngleRef.current;
          const norm   = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const pocket = Math.floor(norm / arc) % N;
          if (pocket !== lastTickPocketRef.current) {
            lastTickPocketRef.current = pocket;
            casinoAudio.playRouletteTick();
          }
        }

        if (t >= 1.0 && !onSpinCalledRef.current) {
          onSpinCalledRef.current   = true;
          relAngleRef.current       = landingTargetRelRef.current;
          ballAngleRef.current      = wheelAngleRef.current + relAngleRef.current;
          ballRadiusRef.current     = POCKET_R;
          ballStateRef.current      = 'settled';
          if (rollSoundRef.current) { rollSoundRef.current.stop(); rollSoundRef.current = null; }
          casinoAudio.playRouletteSettle();
          if (onSpinCompleteRef.current) onSpinCompleteRef.current();
        }

      } else if (state === 'settled') {
        ballAngleRef.current  = wheelAngleRef.current + relAngleRef.current;
        ballRadiusRef.current = POCKET_R;

      } else { // idle
        const res = resultRef.current;
        if (res !== null && res !== undefined) {
          const idx = WHEEL_NUMBERS.indexOf(String(res));
          if (idx !== -1) {
            const rel          = (idx + 0.5) * arc - Math.PI / 2;
            relAngleRef.current    = rel;
            ballAngleRef.current   = wheelAngleRef.current + rel;
            ballRadiusRef.current  = POCKET_R;
          }
        } else {
          ballAngleRef.current  = null;
          ballRadiusRef.current = null;
        }
      }

      draw(rotDeg, ballAngleRef.current, ballRadiusRef.current);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (rollSoundRef.current) { rollSoundRef.current.stop(); rollSoundRef.current = null; }
    };
  }, []);

  return (
    <div style={{ position: 'relative', maxWidth: 380, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #ffd700', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.85))' }} />
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: '50%', display: 'block' }} />
    </div>
  );
}

const CHIP_COLORS = { 10:'#546e7a', 50:'#00897b', 100:'#0288d1', 500:'#7b1fa2', 1000:'#f9a825' };

function BetChip({ value, active, onClick }) {
  const color = CHIP_COLORS[value] || '#546e7a';
  return (
    <div onClick={onClick} style={{
      width: 44, height: 44, borderRadius: '50%',
      background: active ? color : 'transparent',
      border: `2px solid ${active ? color : color + '60'}`,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem',
      color: active ? 'white' : color + 'cc',
      boxShadow: active ? `0 0 12px ${color}55` : 'none',
      transition: 'all 0.15s', userSelect: 'none',
    }}>
      {value >= 1000 ? `${value/1000}K` : value}
    </div>
  );
}

function BettingGrid({ bets, onBet }) {
  const canvasGridRef = useRef(null);
  const [hoverBet, setHoverBet] = useState(null);

  // Layout geometry calculations (expanded cell dimensions)
  function getBetCoordinates(type, value) {
    if (type === 'number') {
      if (value === '0') return { x: 27, y: 24 };
      if (value === '00') return { x: 27, y: 96 };
      const n = parseInt(value);
      const col = Math.floor((n - 1) / 3);
      const row = 2 - ((n - 1) % 3);
      return { x: 54 + col * 48 + 24, y: row * 48 + 24 };
    }
    if (type === 'split') {
      if (value === '0,00') return { x: 27, y: 72 };
      if (value === '0,3') return { x: 54, y: 24 };
      if (value === '0,2') return { x: 54, y: 48 };
      if (value === '00,2') return { x: 54, y: 96 };
      if (value === '00,1') return { x: 54, y: 120 };

      const [n1, n2] = value.split(',').map(Number);
      const col1 = Math.floor((n1 - 1) / 3);
      const row1 = 2 - ((n1 - 1) % 3);
      const col2 = Math.floor((n2 - 1) / 3);
      const row2 = 2 - ((n2 - 1) % 3);

      if (col1 === col2) {
        return { x: 54 + col1 * 48 + 24, y: Math.max(row1, row2) * 48 };
      } else {
        return { x: 54 + Math.max(col1, col2) * 48, y: row1 * 48 + 24 };
      }
    }
    if (type === 'corner') {
      const nums = value.split(',').map(Number);
      const cols = nums.map(n => Math.floor((n - 1) / 3));
      const rows = nums.map(n => 2 - ((n - 1) % 3));
      const midX = 54 + Math.max(...cols) * 48;
      const midY = Math.max(...rows) * 48;
      return { x: midX, y: midY };
    }
    if (type === 'column') {
      const row = 3 - parseInt(value);
      return { x: 630 + 27, y: row * 48 + 24 };
    }
    return null;
  }

  // Draw 3D glossy layered poker chip
  function drawChip(ctx, x, y, amount) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const stackHeight = amount >= 1000 ? 3 : amount >= 100 ? 2 : 1;
    let color = '#6a6a8a';
    if (amount >= 1000) color = '#ffd700';
    else if (amount >= 500) color = '#a78bfa';
    else if (amount >= 100) color = '#00d4ff';
    else if (amount >= 50) color = '#00aa66';

    for (let i = 0; i < stackHeight; i++) {
      const cy = y - i * 3;
      
      ctx.beginPath();
      ctx.arc(x, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Chip edge textures
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, cy, 11, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, cy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
    }

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount;
    ctx.fillText(label, x, y - (stackHeight - 1) * 3);
    ctx.restore();
  }

  // Map mouse hover to split or corner coordinates
  const handleMouseMove = (e) => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 684 / rect.width;
    const scaleY = 144 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hoverType = null;
    let hoverValue = null;
    let hoverNums = [];

    if (mx < 54) {
      if (Math.abs(my - 72) < 8) {
        hoverType = 'split';
        hoverValue = '0,00';
        hoverNums = ['0', '00'];
      } else if (my < 72) {
        hoverType = 'number';
        hoverValue = '0';
        hoverNums = ['0'];
      } else {
        hoverType = 'number';
        hoverValue = '00';
        hoverNums = ['00'];
      }
    } else if (mx >= 54 && mx < 630) {
      const gridX = mx - 54;
      const gridY = my;
      const col = Math.floor(gridX / 48);
      const row = Math.floor(gridY / 48);

      const dx = gridX % 48;
      const dy = gridY % 48;

      const nearLeft = dx < 8;
      const nearRight = dx > 40;
      const nearTop = dy < 8;
      const nearBottom = dy > 40;

      const intersectCol = nearLeft ? col : nearRight ? col + 1 : -1;
      const intersectRow = nearTop ? row : nearBottom ? row + 1 : -1;

      // Corner (4 numbers)
      if (intersectCol > 0 && intersectCol <= 11 && intersectRow > 0 && intersectRow <= 2) {
        const numTopLeft = (intersectCol - 1) * 3 + (3 - (intersectRow - 1));
        const numTopRight = intersectCol * 3 + (3 - (intersectRow - 1));
        const numBotLeft = (intersectCol - 1) * 3 + (3 - intersectRow);
        const numBotRight = intersectCol * 3 + (3 - intersectRow);
        
        hoverType = 'corner';
        const nums = [numTopLeft, numTopRight, numBotLeft, numBotRight].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } 
      // Horizontal Split (2 numbers vertically)
      else if (nearTop && row > 0) {
        const n1 = col * 3 + (3 - (row - 1));
        const n2 = col * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } else if (nearBottom && row < 2) {
        const n1 = col * 3 + (3 - row);
        const n2 = col * 3 + (3 - (row + 1));
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      }
      // Vertical Split (2 numbers horizontally)
      else if (nearLeft && col > 0) {
        const n1 = (col - 1) * 3 + (3 - row);
        const n2 = col * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } else if (nearRight && col < 11) {
        const n1 = col * 3 + (3 - row);
        const n2 = (col + 1) * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      }
      // Straight bet
      else if (col >= 0 && col <= 11 && row >= 0 && row <= 2) {
        const n = col * 3 + (3 - row);
        hoverType = 'number';
        hoverValue = String(n);
        hoverNums = [String(n)];
      }
    } else if (mx >= 630 && mx <= 684) {
      const row = Math.floor(my / 48);
      if (row >= 0 && row <= 2) {
        hoverType = 'column';
        hoverValue = String(3 - row);
        hoverNums = [];
      }
    }

    setHoverBet({ type: hoverType, value: hoverValue, nums: hoverNums });
  };

  const handleMouseLeave = () => {
    setHoverBet(null);
  };

  const handleCanvasClick = () => {
    if (hoverBet && hoverBet.type && hoverBet.value) {
      onBet(hoverBet.type, hoverBet.value);
    }
  };

  // Draw Betting Grid Canvas
  useEffect(() => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const logicalW = 684;
    const logicalH = 144;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, logicalW, logicalH);

    const isHovered = (val) => hoverBet && hoverBet.nums.includes(val);

    // Draw 0
    ctx.fillStyle = isHovered('0') ? 'rgba(0, 212, 255, 0.35)' : '#1a5c1a';
    ctx.fillRect(0, 0, 54, 72);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 54, 72);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 27, 36);

    // Draw 00
    ctx.fillStyle = isHovered('00') ? 'rgba(0, 212, 255, 0.35)' : '#1a5c1a';
    ctx.fillRect(0, 72, 54, 72);
    ctx.strokeRect(0, 72, 54, 72);
    ctx.fillStyle = 'white';
    ctx.fillText('00', 27, 108);

    // Draw Numbers (1-36)
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const n = c * 3 + (3 - r);
        const isNumHovered = isHovered(String(n));
        const cellColor = RED_NUMS.has(n) ? '#8b1a2a' : '#1e1e2f';

        ctx.fillStyle = isNumHovered ? 'rgba(255, 215, 0, 0.3)' : cellColor;
        ctx.fillRect(54 + c * 48, r * 48, 48, 48);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.strokeRect(54 + c * 48, r * 48, 48, 48);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), 54 + c * 48 + 24, r * 48 + 24);
      }
    }

    // Draw Column Bets (2to1)
    for (let r = 0; r < 3; r++) {
      const colVal = String(3 - r);
      const isColHovered = hoverBet && hoverBet.type === 'column' && hoverBet.value === colVal;
      ctx.fillStyle = isColHovered ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(630, r * 48, 54, 48);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.strokeRect(630, r * 48, 54, 48);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px Rajdhani';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2to1', 630 + 27, r * 48 + 24);
    }

    // Draw highlighted split/corner borders
    if (hoverBet && (hoverBet.type === 'split' || hoverBet.type === 'corner')) {
      const coords = getBetCoordinates(hoverBet.type, hoverBet.value);
      if (coords) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.85)';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw all chip piles
    bets.forEach(b => {
      const coords = getBetCoordinates(b.type, b.value);
      if (coords) {
        drawChip(ctx, coords.x, coords.y, b.amount);
      }
    });

  }, [bets, hoverBet]);

  // HTML outside bet cells
  const Cell = ({ label, type, value }) => {
    const myBet = bets.filter(b => b.type === type && b.value === value).reduce((s, b) => s + b.amount, 0);
    let chipColor = '#6a6a8a';
    if (myBet >= 1000) chipColor = '#ffd700';
    else if (myBet >= 500) chipColor = '#a78bfa';
    else if (myBet >= 100) chipColor = '#00d4ff';
    else if (myBet >= 50) chipColor = '#00aa66';

    const textLabel = myBet >= 1000 ? `${(myBet/1000).toFixed(0)}K` : myBet;

    return (
      <div onClick={() => onBet(type, value)} style={{
        minHeight: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,215,0,0.25)', borderRadius: 4, cursor: 'pointer', userSelect: 'none',
        background: myBet > 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.03)',
        transition: 'background 0.1s', fontSize: '0.8rem', fontFamily: 'Rajdhani', fontWeight: 700, color: '#e0e0f0', position: 'relative',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = myBet > 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.03)'}>
        {label}
        {myBet > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 28, height: 28, borderRadius: '50%', background: chipColor,
            border: '2px dashed white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.62rem', fontWeight: 900, color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.4)', pointerEvents: 'none'
          }}>
            {textLabel}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
      {/* Canvas container for numbers, 0, 00, splits, and corners */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 684, aspectRatio: '684/144', marginBottom: 6 }}>
        <canvas
          ref={canvasGridRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block', borderRadius: 4, border: '1px solid rgba(255,215,0,0.3)' }}
        />
      </div>

      {/* Dozens Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(3, 28.07%) 7.89%', gap: 3, width: '100%', maxWidth: 684, marginBottom: 3 }}>
        <div style={{ visibility: 'hidden' }} />
        <Cell label="1st 12" type="dozen" value="1-12" />
        <Cell label="2nd 12" type="dozen" value="13-24" />
        <Cell label="3rd 12" type="dozen" value="25-36" />
        <div style={{ visibility: 'hidden' }} />
      </div>

      {/* Low/High, Red/Black, Even/Odd Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(6, 14.03%) 7.89%', gap: 3, width: '100%', maxWidth: 684 }}>
        <div style={{ visibility: 'hidden' }} />
        <Cell label="1-18" type="half" value="low" />
        <Cell label="Even" type="parity" value="even" />
        <Cell label="Red" type="color" value="red" />
        <Cell label="Black" type="color" value="black" />
        <Cell label="Odd" type="parity" value="odd" />
        <Cell label="19-36" type="half" value="high" />
        <div style={{ visibility: 'hidden' }} />
      </div>
    </div>
  );
}

export default function CasinoRuleta({ balance, onBalanceChange }) {
  const [bets, setBets]         = useState([]);
  const [chip, setChip]         = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult]     = useState(null);
  const [summary, setSummary]   = useState(null);
  const [err, setErr]           = useState('');
  const [pendingSummary, setPendingSummary] = useState(null);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = (type, value) => {
    casinoAudio.playChip();
    setBets(b => {
      const existing = b.find(x => x.type === type && x.value === value);
      if (existing) return b.map(x => x.type === type && x.value === value ? { ...x, amount: x.amount + chip } : x);
      return [...b, { type, value, amount: chip }];
    });
    setSummary(null);
  };

  const spin = async () => {
    if (!bets.length) return setErr('Colocá al menos una apuesta');
    if (totalBet > balance) return setErr('Tokens insuficientes');
    setErr(''); setSpinning(true); setResult(null); setSummary(null); setPendingSummary(null);
    try {
      const res = await api.casinoRuleta({ bets });
      onBalanceChange(res.balance);
      setResult(res.number);
      setPendingSummary(res);
    } catch (e) { setErr(e.message); setSpinning(false); }
  };

  const handleSpinComplete = () => {
    if (pendingSummary) {
      setSummary(pendingSummary);
      setSpinning(false);
      setBets([]);
      pendingSummary.net >= 0 ? casinoAudio.playWin() : casinoAudio.playLose();
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{
        background: '#0e1e2c', border: '1px solid #273f52',
        borderRadius: 14, padding: '20px 22px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}>

        {err && (
          <div style={{
            background: 'rgba(255,69,114,0.12)', border: '1px solid rgba(255,69,114,0.3)',
            borderRadius: 8, padding: '7px 14px', marginBottom: 14,
            fontSize: '0.82rem', color: '#ff8aaa', textAlign: 'center',
          }}>
            {err}
          </div>
        )}

        {/* 2-column layout */}
        <div className="roulette-layout">

          {/* Left: Wheel + chip selector + action */}
          <div className="roulette-wheel-col">
            <RouletteWheel spinning={spinning} result={result} onSpinComplete={handleSpinComplete} />

            {/* Chip selector */}
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 18, marginBottom: 14 }}>
              {[10, 50, 100, 500, 1000].map(v => (
                <BetChip key={v} value={v} active={chip === v} onClick={() => setChip(v)} />
              ))}
            </div>

            {/* Total bet + spin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#0c1a24', border: '1px solid #273f52',
                padding: '9px 14px', borderRadius: 8,
              }}>
                <span style={{ fontSize: '0.68rem', color: '#6a8fa8', fontFamily: 'Rajdhani', letterSpacing: '0.1em' }}>APUESTA TOTAL</span>
                <span style={{ color: '#c8d8e8', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem' }}>
                  {totalBet.toLocaleString('es-AR')}
                  <span style={{ color: '#3d5a70', fontSize: '0.7rem', marginLeft: 4 }}>TK</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: 7 }}>
                {bets.length > 0 && (
                  <button onClick={() => setBets([])} style={{
                    flex: 1, height: 44, borderRadius: 8,
                    background: 'rgba(255,69,114,0.08)', border: '1px solid rgba(255,69,114,0.28)',
                    color: '#ff4572', cursor: 'pointer',
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,114,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,69,114,0.08)'}
                  >
                    LIMPIAR
                  </button>
                )}
                <button onClick={spin} disabled={spinning || !bets.length} style={{
                  flex: 2, height: 44, borderRadius: 8, border: 'none',
                  background: spinning || !bets.length
                    ? 'rgba(0,230,118,0.06)'
                    : 'linear-gradient(135deg, #00c65a, #00e676)',
                  color: spinning || !bets.length ? '#3d5a70' : '#0c1a24',
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.1em',
                  cursor: spinning || !bets.length ? 'not-allowed' : 'pointer',
                  boxShadow: (!spinning && bets.length) ? '0 0 16px rgba(0,230,118,0.22)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {spinning ? 'GIRANDO...' : 'GIRAR'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Result + betting grid + hint */}
          <div className="roulette-grid-col">

            {summary && (
              <div style={{
                width: '100%', marginBottom: 12,
                padding: '10px 16px',
                background: summary.net >= 0 ? 'rgba(0,230,118,0.08)' : 'rgba(255,69,114,0.08)',
                border: `1px solid ${summary.net >= 0 ? 'rgba(0,230,118,0.25)' : 'rgba(255,69,114,0.25)'}`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  background: numberColor(summary.number),
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Rajdhani', fontWeight: 900, color: 'white', fontSize: '1.1rem',
                }}>
                  {summary.number}
                </div>
                <div style={{
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.15rem',
                  color: summary.net >= 0 ? '#00e676' : '#ff4572',
                  letterSpacing: '0.04em',
                }}>
                  {summary.net >= 0
                    ? `+${summary.net.toLocaleString('es-AR')} TK`
                    : `${summary.net.toLocaleString('es-AR')} TK`}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6a8fa8', marginLeft: 'auto' }}>
                  {summary.color?.toUpperCase()}
                </div>
              </div>
            )}

            <BettingGrid bets={bets} onBet={addBet} />

            <div style={{
              width: '100%', marginTop: 10,
              background: '#0c1a24', border: '1px solid #1e3040',
              borderRadius: 7, padding: '7px 12px',
              fontSize: '0.72rem', color: '#3d5a70', lineHeight: 1.45,
            }}>
              Hover sobre el borde de 2 números para apostar Split (18x) · En intersección de 4 para Corner (9x)
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
