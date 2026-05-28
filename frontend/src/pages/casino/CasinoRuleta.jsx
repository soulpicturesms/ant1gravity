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
              fill="#fff" fontSize="9" fontWeight="700"
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${(aMid * 180 / Math.PI) + 90}, ${tx}, ${ty})`}
              style={{ fontFamily: "'JetBrains Mono',monospace" }}
            >{n}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r*0.42} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={r*0.52} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8"/>
    </svg>
  );
}

// ── Wheel + ball (CSS-transition based) ────────────────────────────────
function RouletteWheel({ wheelRot, ballRot, noTransition, result }) {
  return (
    <div className="roul-wheel-wrap">
      <div className="roul-pointer"/>
      <div
        className={`roul-wheel${noTransition ? ' notrans' : ''}`}
        style={{ transform: `rotate(${wheelRot}deg)` }}
      >
        <RouletteWheelSVG/>
        <div className="roul-wheel__center">ant1gravity</div>
      </div>
      <div
        className={`roul-ball${noTransition ? ' notrans' : ''}`}
        style={{ transform: `translateX(-50%) rotate(${ballRot}deg) translateY(0)` }}
      />
    </div>
  );
}

// ── Chip selector button ───────────────────────────────────────────────
const CHIP_COLORS = {
  10:   { bg: '#546e7a', border: '#546e7a' },
  50:   { bg: '#00897b', border: '#00897b' },
  100:  { bg: '#0288d1', border: '#0288d1' },
  500:  { bg: '#7b1fa2', border: '#7b1fa2' },
  1000: { bg: '#f9a825', border: '#f9a825' },
};

function BetChip({ value, active, onClick }) {
  const { bg, border } = CHIP_COLORS[value] || { bg: '#546e7a', border: '#546e7a' };
  return (
    <div
      onClick={onClick}
      className="roul-chip-btn"
      style={{
        background: active ? bg : 'transparent',
        border: `2px dashed ${active ? border : border + '60'}`,
        color: active ? '#fff' : border + 'cc',
        boxShadow: active ? `0 0 12px ${bg}55` : 'none',
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
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    const stack = amount >= 1000 ? 3 : amount >= 100 ? 2 : 1;
    let color = '#6a6a8a';
    if      (amount >= 1000) color = '#f9a825';
    else if (amount >= 500)  color = '#a78bfa';
    else if (amount >= 100)  color = '#00d4ff';
    else if (amount >= 50)   color = '#00aa66';
    for (let i = 0; i < stack; i++) {
      const cy = y - i*3;
      ctx.beginPath(); ctx.arc(x, cy, 13, 0, 2*Math.PI);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.arc(x, cy, 10, 0, 2*Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, cy, 6, 0, 2*Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
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

    // Background
    ctx.fillStyle = '#11111c'; ctx.fillRect(0, 0, 684, 144);

    // 0
    ctx.fillStyle = isH('0') ? 'rgba(255,45,122,0.32)' : '#1f7a4d';
    ctx.fillRect(0, 0, 54, 72);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 54, 72);
    ctx.fillStyle = '#ecedf4'; ctx.font = 'bold 15px JetBrains Mono,monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('0', 27, 36);

    // 00
    ctx.fillStyle = isH('00') ? 'rgba(255,45,122,0.32)' : '#1f7a4d';
    ctx.fillRect(0, 72, 54, 72);
    ctx.strokeRect(0, 72, 54, 72);
    ctx.fillStyle = '#ecedf4';
    ctx.fillText('00', 27, 108);

    // 1-36
    for (let c=0; c<12; c++) {
      for (let r=0; r<3; r++) {
        const n = c*3+(3-r);
        const hovered = isH(String(n));
        ctx.fillStyle = hovered
          ? 'rgba(255,45,122,0.28)'
          : RED_NUMS.has(n) ? '#c53d3d' : '#16161f';
        ctx.fillRect(54+c*48, r*48, 48, 48);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
        ctx.strokeRect(54+c*48, r*48, 48, 48);
        ctx.fillStyle = '#ecedf4';
        ctx.font = 'bold 13px JetBrains Mono,monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(n), 54+c*48+24, r*48+24);
      }
    }

    // Column (2to1)
    for (let r=0; r<3; r++) {
      const val = String(3-r);
      const hovered = hoverBet?.type === 'column' && hoverBet?.value === val;
      ctx.fillStyle = hovered ? 'rgba(255,45,122,0.22)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(630, r*48, 54, 48);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      ctx.strokeRect(630, r*48, 54, 48);
      ctx.fillStyle = '#a5a6b8';
      ctx.font = 'bold 10px JetBrains Mono,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('2to1', 630+27, r*48+24);
    }

    // Split/corner hover indicator
    if (hoverBet && (hoverBet.type==='split' || hoverBet.type==='corner')) {
      const coords = getBetCoordinates(hoverBet.type, hoverBet.value);
      if (coords) {
        ctx.save();
        ctx.beginPath(); ctx.arc(coords.x, coords.y, 6, 0, 2*Math.PI);
        ctx.fillStyle = 'rgba(255,45,122,0.85)';
        ctx.shadowColor = 'rgba(255,45,122,0.6)'; ctx.shadowBlur = 8;
        ctx.fill(); ctx.restore();
      }
    }

    // Chips
    bets.forEach(b => {
      const coords = getBetCoordinates(b.type, b.value);
      if (coords) drawChip(ctx, coords.x, coords.y, b.amount);
    });
  }, [bets, hoverBet]);

  const Cell = ({ label, type, value }) => {
    const myBet = bets.filter(b => b.type===type && b.value===value).reduce((s,b)=>s+b.amount, 0);
    let chipColor = '#6a6a8a';
    if      (myBet >= 1000) chipColor = '#f9a825';
    else if (myBet >= 500)  chipColor = '#a78bfa';
    else if (myBet >= 100)  chipColor = '#00d4ff';
    else if (myBet >= 50)   chipColor = '#00aa66';
    return (
      <div
        onClick={() => onBet(type, value)}
        style={{
          minHeight: 36,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${myBet>0 ? 'rgba(255,45,122,0.28)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 3,
          cursor: 'pointer', userSelect: 'none',
          background: myBet>0 ? 'rgba(255,45,122,0.1)' : 'rgba(255,255,255,0.02)',
          transition: 'background 0.1s, filter 0.1s',
          fontSize: '0.78rem',
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: 700,
          color: myBet>0 ? '#ecedf4' : '#6f7088',
          position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.3)'}
        onMouseLeave={e => e.currentTarget.style.filter = ''}
      >
        {label}
        {myBet > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: '50%',
            background: chipColor,
            border: '1.5px dashed rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}>
            {myBet >= 1000 ? `${(myBet/1000).toFixed(0)}K` : myBet}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', width: '100%', paddingBottom: 4 }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 684, aspectRatio: '684/144', marginBottom: 4 }}>
        <canvas
          ref={canvasGridRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverBet(null)}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>

      {/* Dozens */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(3, 28.07%) 7.89%', gap: 3, maxWidth: 684, marginBottom: 3 }}>
        <div/>
        <Cell label="1st 12" type="dozen" value="1-12"/>
        <Cell label="2nd 12" type="dozen" value="13-24"/>
        <Cell label="3rd 12" type="dozen" value="25-36"/>
        <div/>
      </div>

      {/* Outside */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(6, 14.03%) 7.89%', gap: 3, maxWidth: 684 }}>
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
export default function CasinoRuleta({ balance, onBalanceChange }) {
  const [bets, setBets]         = useState([]);
  const [chip, setChip]         = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult]     = useState(null);
  const [summary, setSummary]   = useState(null);
  const [err, setErr]           = useState('');
  const [history, setHistory]   = useState([]);

  // CSS-transition wheel state
  const [wheelRot, setWheelRot] = useState(0);
  const [ballRot,  setBallRot]  = useState(0);
  const [noTrans,  setNoTrans]  = useState(true);  // disable on first render

  // Enable transitions after first render (so initial position doesn't animate)
  useEffect(() => {
    const id = setTimeout(() => setNoTrans(false), 50);
    return () => clearTimeout(id);
  }, []);

  const rollRef  = useRef(null);
  const tickRef  = useRef(null);

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

      // Wheel: spin 5 full turns + land on winning pocket at top
      const newWheelRot = wheelRot + 360*5 + (360 - idx * segAngle);
      // Ball: spin 9 full counter-clockwise turns → ends at top (matching wheel)
      const newBallRot  = ballRot - 360*9;

      setWheelRot(newWheelRot);
      setBallRot(newBallRot);

      rollRef.current = casinoAudio.playRouletteRoll();
      startTickSounds();

      setTimeout(() => {
        stopSounds();
        casinoAudio.playRouletteSettle();
        setSpinning(false);
        setResult(res.number);
        setHistory(h => [res.number, ...h].slice(0, 12));
        setSummary(res);
        onBalanceChange(res.balance);
        setBets([]);
        res.net >= 0 ? casinoAudio.playWin() : casinoAudio.playLose();
      }, 5300);

    } catch (e) {
      setErr(e.message);
      setSpinning(false);
      stopSounds();
    }
  }, [spinning, bets, totalBet, balance, wheelRot, ballRot, startTickSounds, stopSounds, onBalanceChange]);

  useEffect(() => () => stopSounds(), [stopSounds]);

  const col  = result !== null ? colorOf(String(result)) : null;

  return (
    <div className="casino-roul-view">

      {/* ── LEFT: Bet Panel ────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">Apuesta</div>

        {/* Chip selector */}
        <div>
          <div style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: "'Unbounded',system-ui", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Ficha activa
          </div>
          <div className="roul-chip-selector">
            {[10, 50, 100, 500, 1000].map(v => (
              <BetChip key={v} value={v} active={chip===v} onClick={() => setChip(v)}/>
            ))}
          </div>
        </div>

        {/* Total bet */}
        <div className="roul-total-row">
          <span style={{ fontSize: 9, color: 'var(--c-text4)', fontFamily: "'Unbounded',system-ui", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Apuesta total
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--c-text)', fontSize: 16 }}>
            {totalBet.toLocaleString('es-AR')}
            <span style={{ color: 'var(--c-text4)', fontSize: 10, marginLeft: 4 }}>TK</span>
          </span>
        </div>

        {/* Bets count */}
        {bets.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text3)' }}>
            <span>Posiciones</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--c-text2)' }}>{bets.length}</span>
          </div>
        )}

        {err && <div className="casino-err">{err}</div>}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="roul-spin-btn"
            onClick={spin}
            disabled={spinning || !bets.length}
          >
            {spinning ? 'GIRANDO…' : 'GIRAR RULETA'}
          </button>
          {bets.length > 0 && !spinning && (
            <button className="roul-clear-btn" onClick={() => setBets([])}>
              Limpiar mesa
            </button>
          )}
        </div>

        {/* Mini info */}
        <div style={{ fontSize: 10, color: 'var(--c-text4)', lineHeight: 1.5 }}>
          Ruleta Americana · Doble cero · RTP 94.7%
        </div>
      </div>

      {/* ── RIGHT: Stage ──────────────────────────────── */}
      <div className="casino-roul-stage">

        {/* Stage header */}
        <div className="casino-roul-stage-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="casino-roul-stage-title">Mesa #2104</span>
            <span style={{
              background: 'rgba(111,255,125,0.12)',
              border: '1px solid rgba(111,255,125,0.25)',
              color: 'var(--c-accent2)',
              padding: '2px 8px', borderRadius: 4,
              fontSize: 9, fontWeight: 700,
              fontFamily: "'Inter',sans-serif",
              letterSpacing: '0.1em',
            }}>CASINO</span>
          </div>
          <div className="roul-history">
            {history.slice(0, 10).map((n, i) => (
              <span key={i} className={`roul-history__cell roul-history__cell--${colorOf(String(n))}`}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Wheel */}
        <RouletteWheel
          wheelRot={wheelRot}
          ballRot={ballRot}
          noTransition={noTrans}
          result={result}
        />

        {/* Result banner */}
        {result !== null && !spinning && (
          <div
            className="roul-result-banner"
            style={{
              border: `2px solid ${col==='red' ? '#c53d3d' : col==='green' ? '#1f7a4d' : 'rgba(255,255,255,0.2)'}`,
            }}
          >
            Salió{' '}
            <span style={{ color: col==='red' ? '#ff7070' : col==='green' ? '#6fff7d' : '#ecedf4' }}>
              {result} · {col?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className={`roul-summary roul-summary--${summary.net >= 0 ? 'win' : 'lose'}`}>
            <div className={`roul-summary__num roul-summary__num--${colorOf(String(summary.number))}`}>
              {summary.number}
            </div>
            <div className={`roul-summary__net roul-summary__net--${summary.net >= 0 ? 'win' : 'lose'}`}>
              {summary.net >= 0 ? '+' : ''}{summary.net.toLocaleString('es-AR')} TK
            </div>
            <div className="roul-summary__color">{summary.color}</div>
          </div>
        )}

        {/* Betting grid */}
        <BettingGrid bets={bets} onBet={addBet}/>

        {/* Tip */}
        <div style={{
          fontSize: 10, color: 'var(--c-text4)',
          background: 'var(--c-bg2)',
          border: '1px solid var(--c-line)',
          borderRadius: 6, padding: '6px 12px',
          lineHeight: 1.5, width: '100%', maxWidth: 684,
        }}>
          Bordear 2 números → Split (18×) · Esquina de 4 → Corner (9×)
        </div>
      </div>

    </div>
  );
}
