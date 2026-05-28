import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const numberColor = n => n === 0 ? 'green' : RED_NUMS.has(n) ? '#ff4466' : '#3a3a5a';

const WHEEL_NUMBERS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function RouletteWheel({ spinning, result }) {
  const canvasRef = useRef(null);
  const rotRef    = useRef(0);
  const animRef   = useRef(null);
  const N = WHEEL_NUMBERS.length;

  const draw = (rot) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = canvas.width, cx = S/2, cy = S/2, R = cx - 10;
    ctx.clearRect(0, 0, S, S);
    const arc = (2*Math.PI)/N;
    const rotRad = (rot * Math.PI) / 180;

    for (let i = 0; i < N; i++) {
      const n = WHEEL_NUMBERS[i];
      const start = rotRad + i*arc - Math.PI/2;
      const end   = rotRad + (i+1)*arc - Math.PI/2;
      const mid   = rotRad + (i+0.5)*arc - Math.PI/2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = n === 0 ? '#1a5c1a' : RED_NUMS.has(n) ? '#8b1a2a' : '#1a1a2a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillStyle = '#e0e0f0';
      ctx.font = 'bold 10px Rajdhani, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(n, R - 12, 0);
      ctx.restore();
    }

    // Ring
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2*Math.PI);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.stroke();
    // Center
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2*Math.PI);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    g.addColorStop(0, '#ffd700'); g.addColorStop(1, '#aa8800');
    ctx.fillStyle = g; ctx.fill();
  };

  useEffect(() => {
    draw(rotRef.current);
  }, []);

  useEffect(() => {
    if (!spinning && result !== null && result !== undefined) {
      const targetIdx = WHEEL_NUMBERS.indexOf(result);
      if (targetIdx === -1) return;
      const arcDeg = 360 / N;
      const targetDeg = -(targetIdx + 0.5) * arcDeg;
      const normalized = ((targetDeg % 360) + 360) % 360;
      const current = ((rotRef.current % 360) + 360) % 360;
      let delta = (normalized - current + 360) % 360;
      if (delta < 30) delta += 360;
      const total = rotRef.current + 8*360 + delta;
      const start = rotRef.current;
      const t0 = performance.now();

      const anim = (now) => {
        const p = Math.min((now - t0) / 6000, 1);
        const ease = 1 - Math.pow(1 - p, 5);
        rotRef.current = start + (total - start) * ease;
        draw(rotRef.current);
        if (p < 1) animRef.current = requestAnimationFrame(anim);
      };
      animRef.current = requestAnimationFrame(anim);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, result]);

  return (
    <div style={{ position: 'relative', maxWidth: 320, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '18px solid #ffd700', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))' }} />
      <canvas ref={canvasRef} width={320} height={320} style={{ width: '100%', height: 'auto', borderRadius: '50%', display: 'block' }} />
    </div>
  );
}

function BetChip({ value, active, onClick }) {
  const colors = { 10:'#6a6a8a', 50:'#00aa66', 100:'#00d4ff', 500:'#a78bfa', 1000:'#ffd700' };
  return (
    <div onClick={onClick} style={{ width: 44, height: 44, borderRadius: '50%', background: colors[value] || '#6a6a8a', border: `3px solid ${active ? 'white' : 'rgba(255,255,255,0.3)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.75rem', color: 'white', boxShadow: active ? '0 0 12px rgba(255,255,255,0.5)' : 'none', transition: 'all 0.15s', userSelect: 'none' }}>
      {value >= 1000 ? `${value/1000}K` : value}
    </div>
  );
}

function BettingGrid({ bets, onBet }) {
  const Cell = ({ label, type, value, size = 1 }) => {
    const myBet = bets.filter(b => b.type === type && b.value === value).reduce((s, b) => s + b.amount, 0);
    return (
      <div onClick={() => onBet(type, value)} style={{
        gridColumn: `span ${size}`, minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,215,0,0.3)', borderRadius: 4, cursor: 'pointer', userSelect: 'none',
        background: myBet > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
        transition: 'background 0.1s', fontSize: '0.82rem', fontFamily: 'Rajdhani', fontWeight: 700, color: '#e0e0f0', position: 'relative',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = myBet > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)'}>
        {label}
        {myBet > 0 && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.65rem', color: '#ffd700' }}>{myBet}</span>}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, minWidth: 300, marginBottom: 6 }}>
        {/* Numbers 1-36 in groups of 12 */}
        {Array.from({length: 12}, (_, i) => i).map(row => (
          [1,2,3].map(col => {
            const n = row*3 + col;
            return <div key={n} onClick={() => onBet('number', String(n))} style={{
              height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: RED_NUMS.has(n) ? 'rgba(139,26,42,0.7)' : 'rgba(20,20,40,0.7)',
              border: `1px solid ${bets.some(b => b.type==='number' && b.value===String(n)) ? '#ffd700' : 'rgba(255,215,0,0.2)'}`,
              borderRadius: 3, cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem', color: 'white',
              boxShadow: bets.some(b => b.type==='number' && b.value===String(n)) ? '0 0 8px rgba(255,215,0,0.5)' : 'none',
            }}>{n}</div>;
          })
        ))}
      </div>
      {/* 0 */}
      <div onClick={() => onBet('number', '0')} style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a5c1a', border: `1px solid ${bets.some(b => b.value==='0') ? '#ffd700' : 'rgba(255,215,0,0.2)'}`, borderRadius: 3, cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', marginBottom: 6 }}>0 (Verde)</div>
      {/* Outside bets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 3, marginBottom: 3 }}>
        <Cell label="1-18" type="half" value="low" />
        <Cell label="19-36" type="half" value="high" />
        <Cell label="Par" type="parity" value="even" />
        <Cell label="Impar" type="parity" value="odd" />
        <Cell label="🔴 Rojo" type="color" value="red" />
        <Cell label="⚫ Negro" type="color" value="black" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
        <Cell label="1-12" type="dozen" value="1-12" />
        <Cell label="13-24" type="dozen" value="13-24" />
        <Cell label="25-36" type="dozen" value="25-36" />
        <Cell label="Col 1" type="column" value="1" />
        <Cell label="Col 2" type="column" value="2" />
        <Cell label="Col 3" type="column" value="3" />
      </div>
    </div>
  );
}

export default function CasinoRuleta({ balance, onBalanceChange }) {
  const [bets, setBets]     = useState([]);
  const [chip, setChip]     = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr]       = useState('');

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = (type, value) => {
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
    setErr(''); setSpinning(true); setResult(null); setSummary(null);
    try {
      const res = await api.casinoRuleta({ bets });
      onBalanceChange(res.balance);
      setResult(res.number);
      setTimeout(() => { setSummary(res); setSpinning(false); setBets([]); }, 6500);
    } catch (e) { setErr(e.message); setSpinning(false); }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="card" style={{ border: '1px solid rgba(255,215,0,0.2)', background: 'linear-gradient(135deg, #0a0a18, #0f0f22)' }}>
        <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: '#ffd700', letterSpacing: '0.1em', marginBottom: 20 }}>
          🎰 RULETA CASINO
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

        {/* Result */}
        {summary && (
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '14px', background: summary.net >= 0 ? 'rgba(0,204,102,0.1)' : 'rgba(255,68,102,0.1)', border: `1px solid ${summary.net >= 0 ? '#00cc6644' : '#ff446644'}`, borderRadius: 10 }}>
            <div style={{ marginBottom: 4, background: numberColor(summary.number), width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', fontSize: '1.2rem' }}>{summary.number}</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: summary.net >= 0 ? '#00cc66' : '#ff4466' }}>
              {summary.net >= 0 ? `+${summary.net.toLocaleString('es-AR')}` : summary.net.toLocaleString('es-AR')} tokens
            </div>
          </div>
        )}

        <RouletteWheel spinning={spinning} result={spinning || summary ? result : null} />

        <div style={{ marginTop: 20 }}>
          {/* Chip selector */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {[10,50,100,500,1000].map(v => <BetChip key={v} value={v} active={chip===v} onClick={() => setChip(v)} />)}
          </div>

          <BettingGrid bets={bets} onBet={addBet} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.85rem', color: '#6a6a8a' }}>
              Apuesta total: <strong style={{ color: '#ffd700' }}>{totalBet.toLocaleString('es-AR')}</strong>
              {bets.length > 0 && <button onClick={() => setBets([])} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#ff4466', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Rajdhani' }}>✕ Limpiar</button>}
            </div>
            <button className="btn btn-primary" onClick={spin} disabled={spinning || !bets.length} style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>
              {spinning ? '⏳ Girando...' : '🎰 Girar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
