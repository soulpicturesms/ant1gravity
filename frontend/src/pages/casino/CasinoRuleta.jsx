import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ── American wheel sequence (38 pockets: 0, 00, 1-36) ──────────────────
const WHEEL_NUMBERS = [
  '0','28','9','26','30','11','7','20','32','17','5','22','34','15','3','24',
  '36','13','1','00','27','10','25','29','12','8','19','31','18','6','21','33',
  '16','4','23','35','14','2'
];
const N = 38;
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = n => (n === '0' || n === '00') ? 'green' : RED_NUMS.has(parseInt(n)) ? 'red' : 'black';

// ── SVG Wheel ──────────────────────────────────────────────────────────
function RouletteWheelSVG() {
  const r = 160, cx = r, cy = r;
  return (
    <svg viewBox={`0 0 ${r*2} ${r*2}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="rw-wood" cx="50%" cy="50%" r="50%">
          <stop offset="0"    stopColor="#3a2418"/>
          <stop offset="0.82" stopColor="#1a0e08"/>
          <stop offset="1"    stopColor="#080504"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#rw-wood)"/>
      {WHEEL_NUMBERS.map((n, i) => {
        const a1 = (i / N) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
        const ri = r * 0.52;
        const ro = r * 0.91;
        const x1 = cx + Math.cos(a1)*ri, y1 = cy + Math.sin(a1)*ri;
        const x2 = cx + Math.cos(a1)*ro, y2 = cy + Math.sin(a1)*ro;
        const x3 = cx + Math.cos(a2)*ro, y3 = cy + Math.sin(a2)*ro;
        const x4 = cx + Math.cos(a2)*ri, y4 = cy + Math.sin(a2)*ri;
        const col = colorOf(n);
        const fill = col === 'red' ? '#c53d3d' : col === 'black' ? '#0e0e18' : '#1f7a4d';
        const aMid = (a1 + a2) / 2;
        const tr = r * 0.725;
        const tx = cx + Math.cos(aMid)*tr;
        const ty = cy + Math.sin(aMid)*tr;
        return (
          <g key={i}>
            <path
              d={`M${x1},${y1} L${x2},${y2} A${ro},${ro} 0 0 1 ${x3},${y3} L${x4},${y4} A${ri},${ri} 0 0 0 ${x1},${y1} Z`}
              fill={fill} stroke="#000" strokeWidth="0.5"
            />
            <text
              x={tx} y={ty}
              fill="#fff" fontSize="8" fontWeight="bold" fontFamily="'Inter', sans-serif"
              textAnchor="middle" dominantBaseline="central"
              transform={`rotate(${(aMid * 180)/Math.PI + 90}, ${tx}, ${ty})`}
            >
              {n}
            </text>
          </g>
        );
      })}
      {/* Outer gold rim */}
      <circle cx={cx} cy={cy} r={r * 0.94} fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.85"/>
      {/* Inner center details */}
      <circle cx={cx} cy={cy} r={r * 0.52} fill="#140c08" stroke="#111" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r={r * 0.38} fill="#24150d" stroke="#d4af37" strokeWidth="1" opacity="0.3"/>
      <circle cx={cx} cy={cy} r={r * 0.18} fill="url(#rw-wood)"/>
      <text x={cx} y={cy} fill="rgba(255,255,255,0.08)" fontSize="5" fontWeight="900" fontFamily="Unbounded" textAnchor="middle" dominantBaseline="central">ANT1GRAVITY</text>
    </svg>
  );
}

function RouletteWheel({ wheelRot, ballAngleRel, ballRadius, wheelSize = 420 }) {
  const wRef = useRef(null);
  const size = wheelSize;
  const half = size / 2;

  // Ball screen angle is relative to the counter-clockwise rotation (-wheelRot)
  const screenAngle = ballAngleRel - wheelRot;
  const rad = (screenAngle * Math.PI) / 180;
  const bx = half + Math.cos(rad) * ballRadius;
  const by = half + Math.sin(rad) * ballRadius;

  return (
    <div ref={wRef} style={{ width: size, height: size, position: 'relative', userSelect: 'none', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.85))' }}>
      
      {/* Rotated SVG wheel */}
      <div style={{ width: '100%', height: '100%', transform: `rotate(${-wheelRot}deg)`, transition: 'transform 0s' }}>
        <RouletteWheelSVG />
      </div>

      {/* SVG Ball & Golden Turret */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <radialGradient id="ball-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#eeeeee" />
            <stop offset="100%" stopColor="#aaaaaa" />
          </radialGradient>
        </defs>

        {/* Golden central turret head */}
        <circle cx={half} cy={half} r="18" fill="radial-gradient(circle, #f5c542, #8a640f)" stroke="#111" strokeWidth="1" opacity="0.1"/>
        <path d={`M${half-1},${half-12} L${half+1},${half-12} L${half+4},${half} L${half-4},${half} Z`} fill="#d4af37" opacity="0.8"/>
        <path d={`M${half-12},${half-1} L${half-12},${half+1} L${half},${half+4} L${half},${half-4} Z`} fill="#d4af37" opacity="0.8"/>
        <path d={`M${half-1},${half+12} L${half+1},${half+12} L${half+4},${half} L${half-4},${half} Z`} fill="#d4af37" opacity="0.8"/>
        <path d={`M${half+12},${half-1} L${half+12},${half+1} L${half},${half+4} L${half},${half-4} Z`} fill="#d4af37" opacity="0.8"/>
        <circle cx={half} cy={half} r="5" fill="#d4af37" stroke="#6b4c0b" strokeWidth="1"/>

        {/* Outer light pin pointer indicator */}
        <path d={`M${half},22 L${half-6},8 L${half+6},8 Z`} fill="#ff2d7a" filter="drop-shadow(0 0 6px #ff2d7a)"/>

        {/* Floating white pearl ball (glowing radial gradient) */}
        {ballRadius > 0 && (
          <circle
            cx={bx}
            cy={by}
            r="8.5"
            fill="url(#ball-grad)"
            stroke="#d3d3d3"
            strokeWidth="0.75"
            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.7))"
          />
        )}
      </svg>
    </div>
  );
}

// ── Bet chip button ───────────────────────────────────────────────────
function BetChip({ value, active, onClick }) {
  let color = '#ff2d7a';
  if      (value >= 1000) color = '#f5c542'; // Gold
  else if (value >= 500)  color = '#a78bfa'; // Purple
  else if (value >= 100)  color = '#00d4ff'; // Blue
  else if (value >= 50)   color = '#00aa66'; // Green

  return (
    <div
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: color,
        border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,0.45)'}`,
        boxShadow: active ? `0 0 14px ${color}, 0 4px 10px rgba(0,0,0,0.5)` : '0 2px 5px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.68rem', fontWeight: 900,
        fontFamily: "'JetBrains Mono', monospace",
        cursor: 'pointer', transition: 'all 0.15s',
        transform: active ? 'scale(1.15) translateY(-2px)' : 'none',
        userSelect: 'none',
      }}
    >
      {value >= 1000 ? `${value/1000}K` : value}
    </div>
  );
}

// ── Betting grid (canvas, keeps full split/corner support) ─────────────
function BettingGrid({ bets, onBet }) {
  const canvasGridRef = useRef(null);
  const [hoverBet, setHoverBet] = useState(null);

  function getBetCoordinates(type, value) {
    if (type === 'number') {
      if (value === '0')  return { x: 27, y: 24 };
      if (value === '00') return { x: 27, y: 96 };
      const n = parseInt(value);
      const col = Math.floor((n - 1) / 3);
      const row = 2 - ((n - 1) % 3);
      return { x: 54 + col * 48 + 24, y: row * 48 + 24 };
    }
    if (type === 'split') {
      if (value === '0,00') return { x: 27, y: 72 };
      if (value === '0,3')  return { x: 54, y: 24 };
      if (value === '0,2')  return { x: 54, y: 48 };
      if (value === '00,2') return { x: 54, y: 96 };
      if (value === '00,1') return { x: 54, y: 120 };
      const [n1, n2] = value.split(',').map(Number);
      const col1 = Math.floor((n1-1)/3), row1 = 2-((n1-1)%3);
      const col2 = Math.floor((n2-1)/3), row2 = 2-((n2-1)%3);
      if (col1 === col2) return { x: 54+col1*48+24, y: Math.max(row1,row2)*48 };
      return { x: 54+Math.max(col1,col2)*48, y: row1*48+24 };
    }
    if (type === 'corner') {
      const nums = value.split(',').map(Number);
      const cols = nums.map(n => Math.floor((n-1)/3));
      const rows = nums.map(n => 2-((n-1)%3));
      return { x: 54+Math.max(...cols)*48, y: Math.max(...rows)*48 };
    }
    if (type === 'column') {
      return { x: 630+27, y: (3-parseInt(value))*48+24 };
    }
    return null;
  }

  function drawChip(ctx, x, y, amount) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const stack = amount >= 1000 ? 3 : amount >= 100 ? 2 : 1;
    let color = '#ff2d7a';
    if      (amount >= 1000) color = '#f5c542';
    else if (amount >= 500)  color = '#a78bfa';
    else if (amount >= 100)  color = '#00d4ff';
    else if (amount >= 50)   color = '#00aa66';
    for (let i = 0; i < stack; i++) {
      const cy = y - i*3;
      ctx.beginPath(); ctx.arc(x, cy, 14, 0, 2*Math.PI);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.arc(x, cy, 10, 0, 2*Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, cy, 6, 0, 2*Math.PI); ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff';
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(amount >= 1000 ? `${(amount/1000).toFixed(0)}K` : amount, x, y-(stack-1)*3);
    ctx.restore();
  }

  const handleMouseMove = (e) => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (684 / rect.width);
    const my = (e.clientY - rect.top)  * (144 / rect.height);

    let hoverType = null, hoverValue = null, hoverNums = [];

    if (mx < 54) {
      if (Math.abs(my - 72) < 8) { hoverType='split'; hoverValue='0,00'; hoverNums=['0','00']; }
      else if (my < 72)          { hoverType='number'; hoverValue='0';   hoverNums=['0']; }
      else                       { hoverType='number'; hoverValue='00';  hoverNums=['00']; }
    } else if (mx < 630) {
      const col = Math.floor((mx-54)/48);
      const row = Math.floor(my/48);
      const dx = (mx-54)%48, dy = my%48;
      const nearL = dx<8, nearR = dx>40, nearT = dy<8, nearB = dy>40;
      const iCol = nearL ? col : nearR ? col+1 : -1;
      const iRow = nearT ? row : nearB ? row+1 : -1;

      if (iCol>0 && iCol<=11 && iRow>0 && iRow<=2) {
        const nums = [
          (iCol-1)*3+(3-(iRow-1)), iCol*3+(3-(iRow-1)),
          (iCol-1)*3+(3-iRow),     iCol*3+(3-iRow),
        ].map(String).sort((a,b)=>parseInt(a)-parseInt(b));
        hoverType='corner'; hoverValue=nums.join(','); hoverNums=nums;
      } else if (nearT && row>0) {
        const sorted = [col*3+(3-(row-1)), col*3+(3-row)].map(String).sort((a,b)=>parseInt(a)-parseInt(b));
        hoverType='split'; hoverValue=sorted.join(','); hoverNums=sorted;
      } else if (nearB && row<2) {
        const sorted = [col*3+(3-row), col*3+(3-(row+1))].map(String).sort((a,b)=>parseInt(a)-parseInt(b));
        hoverType='split'; hoverValue=sorted.join(','); hoverNums=sorted;
      } else if (nearL && col>0) {
        const sorted = [(col-1)*3+(3-row), col*3+(3-row)].map(String).sort((a,b)=>parseInt(a)-parseInt(b));
        hoverType='split'; hoverValue=sorted.join(','); hoverNums=sorted;
      } else if (nearR && col<11) {
        const sorted = [col*3+(3-row), (col+1)*3+(3-row)].map(String).sort((a,b)=>parseInt(a)-parseInt(b));
        hoverType='split'; hoverValue=sorted.join(','); hoverNums=sorted;
      } else if (col>=0 && col<=11 && row>=0 && row<=2) {
        const n = col*3+(3-row);
        hoverType='number'; hoverValue=String(n); hoverNums=[String(n)];
      }
    } else if (mx <= 684) {
      const row = Math.floor(my/48);
      if (row>=0 && row<=2) { hoverType='column'; hoverValue=String(3-row); hoverNums=[]; }
    }
    setHoverBet({ type: hoverType, value: hoverValue, nums: hoverNums });
  };

  const handleCanvasClick = () => {
    if (hoverBet?.type && hoverBet?.value) onBet(hoverBet.type, hoverBet.value);
  };

  useEffect(() => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 684 * dpr; canvas.height = 144 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.resetTransform(); ctx.scale(dpr, dpr);

    const isH = val => hoverBet?.nums?.includes(val);

    // Grid Felt background
    ctx.fillStyle = '#0f1016'; ctx.fillRect(0, 0, 684, 144);

    // 0
    ctx.fillStyle = isH('0') ? 'rgba(255,45,122,0.28)' : '#1a5c37';
    ctx.fillRect(1, 1, 52, 70);
    ctx.strokeStyle = isH('0') ? '#ff2d7a' : 'rgba(212, 175, 55, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 52, 70);
    ctx.fillStyle = '#fff'; ctx.font = "bold 15px 'Unbounded', system-ui, sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('0', 27, 36);

    // 00
    ctx.fillStyle = isH('00') ? 'rgba(255,45,122,0.28)' : '#1a5c37';
    ctx.fillRect(1, 73, 52, 70);
    ctx.strokeStyle = isH('00') ? '#ff2d7a' : 'rgba(212, 175, 55, 0.22)';
    ctx.strokeRect(1, 73, 52, 70);
    ctx.fillStyle = '#fff';
    ctx.fillText('00', 27, 108);

    // 1-36
    for (let c=0; c<12; c++) {
      for (let r=0; r<3; r++) {
        const n = c*3+(3-r);
        const hovered = isH(String(n));
        const isRed = RED_NUMS.has(n);
        ctx.fillStyle = hovered
          ? 'rgba(255,45,122,0.32)'
          : isRed ? '#a62e3b' : '#1b1c24';
        ctx.fillRect(54 + c * 48 + 1, r * 48 + 1, 46, 46);
        ctx.strokeStyle = hovered ? '#ff2d7a' : 'rgba(212, 175, 55, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(54 + c * 48 + 1, r * 48 + 1, 46, 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 13px 'Unbounded', system-ui, sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 2;
        ctx.fillText(String(n), 54 + c * 48 + 24, r * 48 + 24);
        ctx.shadowBlur = 0;
      }
    }

    // Column (2to1)
    for (let r=0; r<3; r++) {
      const val = String(3-r);
      const hovered = hoverBet?.type === 'column' && hoverBet?.value === val;
      ctx.fillStyle = hovered ? 'rgba(255,45,122,0.22)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(630 + 1, r * 48 + 1, 52, 46);
      ctx.strokeStyle = hovered ? '#ff2d7a' : 'rgba(212, 175, 55, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(630 + 1, r * 48 + 1, 52, 46);
      ctx.fillStyle = '#a5a6b8';
      ctx.font = "bold 10px 'Unbounded', system-ui, sans-serif";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('2to1', 630 + 27, r * 48 + 24);
    }

    // Split/corner hover indicator dot
    if (hoverBet && (hoverBet.type==='split' || hoverBet.type==='corner')) {
      const coords = getBetCoordinates(hoverBet.type, hoverBet.value);
      if (coords) {
        ctx.save();
        ctx.beginPath(); ctx.arc(coords.x, coords.y, 6, 0, 2*Math.PI);
        ctx.fillStyle = '#ff2d7a';
        ctx.shadowColor = '#ff2d7a'; ctx.shadowBlur = 8;
        ctx.fill(); ctx.restore();
      }
    }

    // Draw stacked chips on board coordinates
    bets.forEach(b => {
      const coords = getBetCoordinates(b.type, b.value);
      if (coords) drawChip(ctx, coords.x, coords.y, b.amount);
    });
  }, [bets, hoverBet]);

  const Cell = ({ label, type, value }) => {
    const myBet = bets.filter(b => b.type===type && b.value===value).reduce((s,b)=>s+b.amount, 0);
    let chipColor = '#ff2d7a';
    if      (myBet >= 1000) chipColor = '#f5c542';
    else if (myBet >= 500)  chipColor = '#a78bfa';
    else if (myBet >= 100)  chipColor = '#00d4ff';
    else if (myBet >= 50)   chipColor = '#00aa66';

    const isRed = value === 'red';
    const isBlack = value === 'black';

    let bg = 'rgba(255,255,255,0.03)';
    let border = '1px solid rgba(212, 175, 55, 0.18)';
    let color = '#8a8b9c';

    if (myBet > 0) {
      bg = 'rgba(255,45,122,0.12)';
      border = '1px solid #ff2d7a';
      color = '#ecedf4';
    } else if (isRed) {
      bg = 'linear-gradient(135deg, rgba(166,46,59,0.18), rgba(166,46,59,0.05))';
      border = '1px solid rgba(166,46,59,0.4)';
      color = '#ff6b7a';
    } else if (isBlack) {
      bg = 'linear-gradient(135deg, rgba(27,28,36,0.5), rgba(10,10,12,0.4))';
      border = '1px solid rgba(255,255,255,0.08)';
      color = '#a5a6b8';
    }

    return (
      <div
        onClick={() => onBet(type, value)}
        style={{
          minHeight: 38,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          border,
          borderRadius: 6,
          cursor: 'pointer', userSelect: 'none',
          background: bg,
          transition: 'all 0.15s',
          fontSize: '0.72rem',
          fontFamily: "'Unbounded', system-ui, sans-serif",
          fontWeight: 700,
          color,
          position: 'relative',
          boxShadow: myBet > 0 ? '0 0 10px rgba(255,45,122,0.15)' : 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.filter = 'brightness(1.25)';
          e.currentTarget.style.borderColor = myBet > 0 ? '#ff2d7a' : 'rgba(212, 175, 55, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.filter = '';
          e.currentTarget.style.borderColor = border.split(' ')[2];
        }}
      >
        {label}
        {myBet > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 25, height: 25, borderRadius: '50%',
            background: chipColor,
            border: '1.2px dashed rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.58rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 3px 6px rgba(0,0,0,0.6)', pointerEvents: 'none',
          }}>
            {myBet >= 1000 ? `${(myBet/1000).toFixed(0)}K` : myBet}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'hidden', width: '100%', paddingBottom: 4 }}>
      {/* Container wraps and scales 100% of parent width */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100%', aspectRatio: '684/144', marginBottom: 6 }}>
        <canvas
          ref={canvasGridRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverBet(null)}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>

      {/* Dozens - stretched */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(3, 28.07%) 7.89%', gap: 4, maxWidth: '100%', marginBottom: 4 }}>
        <div/>
        <Cell label="1st 12" type="dozen" value="1-12"/>
        <Cell label="2nd 12" type="dozen" value="13-24"/>
        <Cell label="3rd 12" type="dozen" value="25-36"/>
        <div/>
      </div>

      {/* Outside - low/high low limits, colors & parities */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(6, 14.03%) 7.89%', gap: 4, maxWidth: '100%' }}>
        <div/>
        <Cell label="1-18"  type="half"   value="low"/>
        <Cell label="Par"   type="parity" value="even"/>
        <Cell label="Rojo"  type="color"  value="red"/>
        <Cell label="Negro" type="color"  value="black"/>
        <Cell label="Impar" type="parity" value="odd"/>
        <Cell label="19-36" type="half"   value="high"/>
        <div/>
      </div>
    </div>
  );
}

// ── Main Roulette component ────────────────────────────────────────────
export default function CasinoRuleta({ balance, onBalanceChange, triggerWinAnimation }) {
  const [bets, setBets]         = useState([]);
  const [chip, setChip]         = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult]     = useState(null);
  const [summary, setSummary]   = useState(null);
  const [err, setErr]           = useState('');
  const [history, setHistory]   = useState([]);

  // Physical wheel scaling to 420px
  const WHEEL_SIZE = 420;
  const ballRadiusScale = WHEEL_SIZE / 320;

  // JS physics animation loop states
  const [wheelRot, setWheelRot] = useState(0);
  const [ballAngleRel, setBallAngleRel] = useState(0);
  const [ballRadius, setBallRadius] = useState(145 * ballRadiusScale);

  const animRef  = useRef(null);
  const rollRef  = useRef(null);
  const tickRef  = useRef(null);
  const bgCanvasRef = useRef(null);
  const bgParticlesRef = useRef([]);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = useCallback((type, value) => {
    casinoAudio.playChip();
    setBets(prev => {
      const ex = prev.find(x => x.type===type && x.value===value);
      if (ex) return prev.map(x => x.type===type && x.value===value ? { ...x, amount: x.amount+chip } : x);
      return [...prev, { type, value, amount: chip }];
    });
    setSummary(null);
  }, [chip]);

  const stopSounds = useCallback(() => {
    clearTimeout(tickRef.current);
    if (rollRef.current) { rollRef.current.stop(); rollRef.current = null; }
  }, []);

  const startTickSounds = useCallback(() => {
    let delay = 55;
    const tick = () => {
      casinoAudio.playRouletteTick();
      delay = Math.min(delay * 1.065, 380);
      if (delay < 380) tickRef.current = setTimeout(tick, delay);
    };
    tickRef.current = setTimeout(tick, delay);
  }, []);

  const spin = useCallback(async () => {
    if (spinning) return;
    if (!bets.length)      return setErr('Colocá al menos una apuesta');
    if (totalBet > balance) return setErr('Tokens insuficientes');
    setErr(''); setSpinning(true); setResult(null); setSummary(null);

    try {
      const res = await api.casinoRuleta({ bets });

      const winningNum = String(res.number);
      const idx        = WHEEL_NUMBERS.indexOf(winningNum);
      const segAngle   = 360 / N;
      const targetAngleRel = idx * segAngle + (segAngle / 2);

      const animStart = performance.now();
      const duration = 5200;

      const initialWheelRot = wheelRot % 360;
      
      // Screen angle starts as (relative angle - wheelRot)
      const initialBallAngleScreen = (ballAngleRel - wheelRot) % 360;

      rollRef.current = casinoAudio.playRouletteRoll();
      startTickSounds();

      const easeOutQuad = t => t * (2 - t);
      const easeOutCubic = t => (--t) * t * t + 1;

      const tick = (now) => {
        const elapsed = now - animStart;
        if (elapsed >= duration) {
          stopSounds();
          casinoAudio.playRouletteSettle();

          const finalWheelRot = initialWheelRot + 360 * 3.5;
          setWheelRot(finalWheelRot);
          setBallAngleRel(targetAngleRel);
          setBallRadius(110 * ballRadiusScale);

          setSpinning(false);
          setResult(winningNum);

          const net = res.totalPayout - totalBet;
          setSummary({ number: winningNum, payout: res.totalPayout, net, color: colorOf(winningNum) });

          onBalanceChange(res.balance);
          if (res.totalPayout > 0) triggerWinAnimation(res.totalPayout);
          return;
        }

        const t = elapsed / duration;

        // Decelerating wheel rotation clockwise (positive)
        const currentWheelRot = initialWheelRot + (360 * 3.5) * easeOutQuad(t);
        setWheelRot(currentWheelRot);

        // Physics: Ball deceleration & orbit decay spiral
        let currentBallAngleRel;
        let currentBallRadius;

        if (t < 0.62) {
          const ballT = t / 0.62;
          const totalBallSpins = 360 * 6.5;
          const ballAngleScreen = initialBallAngleScreen - totalBallSpins * easeOutQuad(ballT);
          // Correct relative coordinate conversion (relative = screen + wheel)
          currentBallAngleRel = ((ballAngleScreen + currentWheelRot) % 360 + 360) % 360;
          currentBallRadius = (145 - 22 * easeOutCubic(ballT)) * ballRadiusScale;
        } else {
          const settleT = (t - 0.62) / 0.38;
          const bounceAmp = 12 * Math.exp(-settleT * 2.8) * Math.sin(settleT * Math.PI * 4.5);
          currentBallRadius = (110 + bounceAmp) * ballRadiusScale;

          const bounceAngleAmp = 18 * Math.exp(-settleT * 3.2) * Math.cos(settleT * Math.PI * 4.5);
          currentBallAngleRel = (targetAngleRel + bounceAngleAmp + 360) % 360;
        }

        setBallAngleRel(currentBallAngleRel);
        setBallRadius(currentBallRadius);

        animRef.current = requestAnimationFrame(tick);
      };

      animRef.current = requestAnimationFrame(tick);

    } catch (e) {
      setErr(e.message);
      setSpinning(false);
      stopSounds();
    }
  }, [spinning, bets, totalBet, balance, wheelRot, ballAngleRel, startTickSounds, stopSounds, onBalanceChange, triggerWinAnimation, ballRadiusScale]);

  useEffect(() => () => {
    stopSounds();
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, [stopSounds]);

  // Ambient gold/pink sparkles background particle system loop
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const particles = [];
    for (let i = 0; i < 28; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 2.2,
        speedY: -0.15 - Math.random() * 0.3,
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: 0.12 + Math.random() * 0.45,
        color: Math.random() > 0.48 ? '255, 45, 122' : '245, 197, 66',
      });
    }
    bgParticlesRef.current = particles;

    let animId;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pArr = bgParticlesRef.current;
      pArr.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2*Math.PI);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = `rgba(${p.color}, 0.85)`;
        ctx.fill();
        ctx.restore();
      });

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const now = performance.now();

      ctx.save();
      ctx.lineWidth = 1.2;

      // Pulsing Ring 1 (pink)
      ctx.strokeStyle = `rgba(255, 45, 122, ${0.07 + Math.sin(now / 700) * 0.03})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 185 + Math.sin(now / 700) * 8, 0, 2*Math.PI);
      ctx.stroke();

      // Pulsing Ring 2 (gold)
      ctx.strokeStyle = `rgba(245, 197, 66, ${0.04 + Math.cos(now / 900) * 0.02})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 225 + Math.cos(now / 900) * 12, 0, 2*Math.PI);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const col  = result !== null ? colorOf(String(result)) : null;

  return (
    <div className="casino-roul-view">
      <style>{`
        @keyframes roulLightChaser {
          0%, 100% { fill: #ff2d7a; filter: drop-shadow(0 0 1px #ff2d7a); opacity: 0.35; }
          50% { fill: #f5c542; filter: drop-shadow(0 0 4px #f5c542); opacity: 1; }
        }
        .roul-idle-light {
          animation: roulLightChaser 1.8s infinite linear;
        }
        @keyframes roulGlowRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) rotate(180deg); opacity: 0.75; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.4; }
        }
        .roul-bg-halo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 580px;
          height: 580px;
          background: conic-gradient(
            from 0deg,
            rgba(255, 45, 122, 0.22) 0deg,
            rgba(111, 255, 125, 0.12) 120deg,
            rgba(245, 197, 66, 0.15) 240deg,
            rgba(255, 45, 122, 0.22) 360deg
          );
          filter: blur(65px);
          border-radius: 50%;
          animation: roulGlowRotate 12s infinite linear;
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 1200px) {
          .roul-stage-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── LEFT PANEL: Professional Sidebar ── */}
      <div className="casino-roul-panel">
        
        {/* Active Chip selector */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: "'Unbounded',system-ui", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Ficha activa
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
            {[10, 50, 100, 500, 1000].map(v => (
              <button
                key={v}
                disabled={spinning}
                onClick={() => setChip(v)}
                style={{
                  padding: '9px 0',
                  borderRadius: 8,
                  background: chip === v ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                  border: `1.5px solid ${chip === v ? 'rgba(255,45,122,0.45)' : 'var(--c-line2)'}`,
                  color: chip === v ? 'var(--c-accent)' : 'var(--c-text3)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: spinning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: chip === v ? '0 0 10px rgba(255,45,122,0.25)' : 'none',
                }}
              >
                {v >= 1000 ? `${v/1000}K` : v}
              </button>
            ))}
          </div>
        </div>

        {/* Total Bet stats */}
        <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: "'Unbounded',system-ui", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Apuesta total
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: 'var(--c-accent2)', fontSize: 22, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            {totalBet.toLocaleString('es-AR')}
            <span style={{ color: 'var(--c-text4)', fontSize: 11, fontWeight: 700 }}>TK</span>
          </div>
          {bets.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--c-text3)', marginTop: 4 }}>
              Posiciones: <span style={{ color: '#fff', fontWeight: 600 }}>{bets.length}</span>
            </div>
          )}
        </div>

        {/* Spin action buttons */}
        <button
          className="roul-spin-btn"
          onClick={spin}
          disabled={spinning || !bets.length}
          style={{
            height: 48,
            fontSize: '0.8rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ff2d7a, #d91b5c)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            boxShadow: (spinning || !bets.length) ? 'none' : '0 4px 15px rgba(255,45,122,0.35)',
            cursor: (spinning || !bets.length) ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {spinning ? 'GIRANDO…' : 'GIRAR RULETA'}
        </button>

        {bets.length > 0 && !spinning && (
          <button
            onClick={() => setBets([])}
            style={{
              height: 36,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.15)'}
            onMouseLeave={e => e.target.style.background = 'rgba(239, 68, 68, 0.08)'}
          >
            Limpiar mesa
          </button>
        )}

        {err && <div className="casino-err" style={{ marginTop: 0 }}>{err}</div>}

        {/* Tips / information */}
        <div style={{ fontSize: '0.68rem', color: 'var(--c-text4)', lineHeight: 1.5, borderTop: '1px dashed var(--c-line2)', paddingTop: 12, marginTop: 'auto' }}>
          💡 Tip: Colocá fichas en las esquinas de los números para apostar a cuatro a la vez (**Corner - 9x**) o en la línea divisoria para dos (**Split - 18x**).
        </div>
      </div>

      {/* ── RIGHT COLUMN: STAGE WITH WHEEL & TAPETE GRID ── */}
      <div className="casino-roul-stage" style={{ minHeight: 580 }}>
        
        <div className="roul-stage-grid" style={{
          display: 'grid',
          gridTemplateColumns: '430px 1fr',
          gap: 20,
          width: '100%',
          alignItems: 'center',
          position: 'relative'
        }}>
          
          {/* Wheel area box on left */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-line2)',
            borderRadius: 14,
            padding: '24px 20px',
            minHeight: 520,
            overflow: 'hidden',
          }}>
            
            {/* Ambient Conic Glowing Halo Background & Particle Canvas */}
            <div className="roul-bg-halo" />
            <canvas ref={bgCanvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />

            {/* Ticker header for recent numbers */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              zIndex: 2,
              marginBottom: 16,
              borderBottom: '1px solid var(--c-line2)',
              paddingBottom: 10
            }}>
              <span style={{ fontSize: 9, fontFamily: 'Unbounded', color: 'var(--c-text4)', fontWeight: 700, letterSpacing: '0.12em' }}>
                ÚLTIMOS NÚMEROS
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {history.slice(0, 6).map((n, i) => (
                  <span key={i} className={`roul-history__cell roul-history__cell--${colorOf(String(n))}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* The wheel canvas element */}
            <div style={{ zIndex: 2 }}>
              <RouletteWheel
                wheelRot={wheelRot}
                ballAngleRel={ballAngleRel}
                ballRadius={ballRadius}
                wheelSize={WHEEL_SIZE}
              />
            </div>

            {/* Result banner overlay */}
            {result !== null && !spinning && (
              <div
                className="roul-result-banner"
                style={{
                  zIndex: 2,
                  marginTop: 20,
                  border: `2px solid ${col==='red' ? '#c53d3d' : col==='green' ? '#1f7a4d' : 'rgba(255,255,255,0.2)'}`,
                }}
              >
                Salió{' '}
                <span style={{ color: col==='red' ? '#ff7070' : col==='green' ? '#6fff7d' : '#ecedf4' }}>
                  {result} · {col?.toUpperCase()}
                </span>
              </div>
            )}

            {summary && (
              <div className={`roul-summary roul-summary--${summary.net >= 0 ? 'win' : 'lose'}`} style={{ zIndex: 2, marginTop: 10 }}>
                <div className={`roul-summary__num roul-summary__num--${colorOf(String(summary.number))}`}>
                  {summary.number}
                </div>
                <div className={`roul-summary__net roul-summary__net--${summary.net >= 0 ? 'win' : 'lose'}`}>
                  {summary.net >= 0 ? '+' : ''}{summary.net.toLocaleString('es-AR')} TK
                </div>
              </div>
            )}
          </div>

          {/* Betting board felt on the right (Stretched to 100%) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-line2)',
            borderRadius: 14,
            padding: '24px 20px',
            minHeight: 520,
            justifyContent: 'center',
          }}>
            
            {/* The canvas grid tapete container */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <BettingGrid bets={bets} onBet={addBet} />
            </div>

            {/* Grid footer specs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--c-text4)', fontSize: 9, marginTop: 22, borderTop: '1px dashed var(--c-line2)', paddingTop: 12 }}>
              <span>Doble cero • RTP 94.7%</span>
              <span>Ruleta Americana</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
