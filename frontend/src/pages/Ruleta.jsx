import React, { useRef, useEffect, useState, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const COLORS = [
  '#0e2a5e', '#5e0e2a', '#0e5e2a', '#5e2a0e',
  '#2a0e5e', '#0e5e5e', '#5e5e0e', '#5e1515',
  '#0e0e5e', '#1a5e1a', '#5e0e5e', '#0e4a2a',
  '#4a2a1a', '#2a2a5e', '#3a1a5e', '#5e3a0e',
  '#0e3a5e', '#5e0e5e', '#1a5e3a', '#5e1a0e',
];

const SIZE = 500;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = CX - 15;

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

// Returns the [start, end) angle (in turns, 0..1) of each prize's segment, sized by weight
function segmentRanges(prizes) {
  const total = prizes.reduce((s, p) => s + (p.weight || 1), 0);
  let acc = 0;
  return prizes.map(p => {
    const start = acc / total;
    acc += (p.weight || 1);
    return [start, acc / total];
  });
}

function drawWheel(ctx, prizes, rot) {
  const n = prizes.length;
  if (n < 2) return;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const rotRad = (rot * Math.PI) / 180;
  const ranges = segmentRanges(prizes);

  for (let i = 0; i < n; i++) {
    const [segStart, segEnd] = ranges[i];
    const start = rotRad + segStart * 2 * Math.PI - Math.PI / 2;
    const end = rotRad + segEnd * 2 * Math.PI - Math.PI / 2;
    const mid = (start + end) / 2;

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(mid);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0f0';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;

    const maxW = R * 0.54;
    ctx.font = 'bold 12px Rajdhani, sans-serif';
    const name = prizes[i].name;

    if (ctx.measureText(name).width <= maxW) {
      ctx.fillText(name, R - 14, 0);
    } else {
      const words = name.split(' ');
      const half = Math.ceil(words.length / 2);
      ctx.font = 'bold 10px Rajdhani, sans-serif';
      ctx.fillText(words.slice(0, half).join(' '), R - 14, -6);
      ctx.fillText(words.slice(half).join(' '), R - 14, 6);
    }
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, 2 * Math.PI);
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 22, 0, 2 * Math.PI);
  const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 22);
  grad.addColorStop(0, '#00d4ff');
  grad.addColorStop(1, '#003388');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function Ruleta() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const canvasRef = useRef(null);
  const rotRef = useRef(0);
  const animRef = useRef(null);
  const prizesRef = useRef([]);

  const [prizes, setPrizes] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editor state (admin only)
  const [newPrize, setNewPrize] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const redraw = useCallback((list, rot) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas.getContext('2d'), list, rot);
  }, []);

  useEffect(() => {
    api.getRuletaPrizes().then(list => {
      setPrizes(list);
      prizesRef.current = list;
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  useEffect(() => {
    if (!loading && prizes.length > 0) {
      redraw(prizes, rotRef.current);
    }
  }, [prizes, loading, redraw]);

  const spin = () => {
    if (spinning || prizes.length < 2) return;
    setSpinning(true);
    setWinner(null);
    setShowWinner(false);

    const ranges = segmentRanges(prizes);
    const totalWeight = prizes.reduce((s, p) => s + (p.weight || 1), 0);
    let pick = Math.random() * totalWeight;
    let winIndex = 0;
    for (let i = 0; i < prizes.length; i++) {
      pick -= (prizes[i].weight || 1);
      if (pick <= 0) { winIndex = i; break; }
      winIndex = i;
    }
    const [segStart, segEnd] = ranges[winIndex];
    const midTurns = (segStart + segEnd) / 2;
    const normalizedTarget = ((-midTurns * 360) % 360 + 360) % 360;
    const currentNorm = ((rotRef.current % 360) + 360) % 360;
    let delta = (normalizedTarget - currentNorm + 360) % 360;
    if (delta < 20) delta += 360;
    const totalTarget = rotRef.current + (8 + Math.floor(Math.random() * 5)) * 360 + delta;

    const startRot = rotRef.current;
    const startTime = performance.now();
    const ctx = canvasRef.current.getContext('2d');
    const currentPrizes = [...prizes];

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 6000, 1);
      const newRot = startRot + (totalTarget - startRot) * easeOutQuint(progress);
      rotRef.current = newRot;
      drawWheel(ctx, currentPrizes, newRot);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotRef.current = totalTarget;
        drawWheel(ctx, currentPrizes, totalTarget);
        setSpinning(false);
        setWinner(currentPrizes[winIndex].name);
        setShowWinner(true);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const addPrize = async () => {
    const name = newPrize.trim();
    if (!name) return;
    const updated = [...prizes, { name, weight: 1 }];
    setSaving(true);
    try {
      await api.setRuletaPrizes(updated);
      setPrizes(updated);
      prizesRef.current = updated;
      setNewPrize('');
      setEditMsg('Premio agregado');
    } catch (e) {
      setEditMsg(e.message);
    }
    setSaving(false);
    setTimeout(() => setEditMsg(''), 3000);
  };

  const removePrize = async (index) => {
    if (prizes.length <= 2) { setEditMsg('Mínimo 2 premios'); setTimeout(() => setEditMsg(''), 3000); return; }
    const updated = prizes.filter((_, i) => i !== index);
    setSaving(true);
    try {
      await api.setRuletaPrizes(updated);
      setPrizes(updated);
      prizesRef.current = updated;
      setEditMsg('Premio eliminado');
    } catch (e) {
      setEditMsg(e.message);
    }
    setSaving(false);
    setTimeout(() => setEditMsg(''), 3000);
  };

  const commitWeight = async (index, rawValue) => {
    const weight = Math.max(0.01, Number(rawValue) || 1);
    if (weight === prizes[index].weight) return;
    const updated = prizes.map((p, i) => (i === index ? { ...p, weight } : p));
    setSaving(true);
    try {
      await api.setRuletaPrizes(updated);
      setPrizes(updated);
      prizesRef.current = updated;
      setEditMsg('Probabilidad actualizada');
    } catch (e) {
      setEditMsg(e.message);
    }
    setSaving(false);
    setTimeout(() => setEditMsg(''), 3000);
  };

  const totalWeight = prizes.reduce((s, p) => s + (p.weight || 1), 0);

  if (loading) return <div className="loading"><div className="spinner"></div> Cargando ruleta...</div>;

  return (
    <div className="page">

      {/* Guild branding header */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, paddingBottom: 28, marginBottom: 4,
        borderBottom: '1px solid #1e1e30',
      }}>
        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }} />
          <img
            src="/logo-icon.png"
            alt="ANT1GRAVITY"
            style={{
              width: 90, height: 90, objectFit: 'contain',
              filter: 'drop-shadow(0 0 18px rgba(0,212,255,0.7))',
              position: 'relative', zIndex: 1,
            }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none', width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00aacc, #0044aa)',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: 'white',
            border: '3px solid #00d4ff44', boxShadow: '0 0 24px rgba(0,212,255,0.4)',
          }}>AG</div>
        </div>

        {/* Guild name */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2.2rem',
            letterSpacing: '0.18em', color: 'white', lineHeight: 1,
          }}>
            ANT<span style={{ color: '#00d4ff' }}>1</span>GRAVITY
          </div>
          <div style={{
            fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '1rem',
            letterSpacing: '0.35em', color: '#6a6a8a', marginTop: 4,
            textTransform: 'uppercase',
          }}>
            Ruleta de Monturas
          </div>
        </div>

        <div className="accent-line" style={{ width: 120, margin: '4px 0 0' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Winner banner */}
        <div style={{ minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 520 }}>
          {showWinner && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,68,170,0.12))',
              border: '1px solid rgba(0,212,255,0.5)',
              borderRadius: 12,
              padding: '14px 36px',
              textAlign: 'center',
              width: '100%',
              boxShadow: '0 0 30px rgba(0,212,255,0.15)',
            }}>
              <div style={{ fontSize: '0.78rem', color: '#6a6a8a', letterSpacing: '0.15em', marginBottom: 4 }}>GANADOR</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#00d4ff', letterSpacing: '0.05em' }}>
                🏆 {winner}
              </div>
            </div>
          )}
        </div>

        {/* Wheel */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
          <div style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
            borderTop: '24px solid #00d4ff',
            filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.9))', zIndex: 2,
          }} />
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onClick={spin}
            style={{
              width: '100%', height: 'auto', display: 'block',
              cursor: spinning ? 'not-allowed' : 'pointer',
              filter: 'drop-shadow(0 0 24px rgba(0,212,255,0.25))',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* Spin button */}
        <button
          className="btn btn-primary"
          onClick={spin}
          disabled={spinning}
          style={{
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.15rem',
            letterSpacing: '0.12em', padding: '13px 56px',
            opacity: spinning ? 0.55 : 1,
            cursor: spinning ? 'not-allowed' : 'pointer',
            boxShadow: spinning ? 'none' : '0 0 20px rgba(0,212,255,0.3)',
          }}
        >
          {spinning ? '⏳ GIRANDO...' : '🎰 GIRAR'}
        </button>

        {/* Prizes list */}
        <div className="card" style={{ width: '100%', maxWidth: 520 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>Premios disponibles ({prizes.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {prizes.map((p, i) => {
              const isWinner = showWinner && winner === p.name;
              const pct = totalWeight > 0 ? ((p.weight || 1) / totalWeight) * 100 : 0;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 6,
                  background: isWinner ? 'rgba(0,212,255,0.1)' : 'transparent',
                  border: `1px solid ${isWinner ? 'rgba(0,212,255,0.35)' : 'transparent'}`,
                  transition: 'all 0.4s',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: COLORS[i % COLORS.length],
                    border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'Rajdhani', fontWeight: isWinner ? 700 : 500,
                    fontSize: '0.88rem', color: isWinner ? '#00d4ff' : '#9090b0',
                    flex: 1, transition: 'color 0.4s',
                  }}>{p.name}</span>
                  {isWinner && <span style={{ fontSize: '0.75rem' }}>🏆</span>}
                  <span style={{
                    fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.8rem',
                    color: '#4a8a9a', minWidth: 46, textAlign: 'right', flexShrink: 0,
                  }}>{pct.toFixed(1)}%</span>
                  {isAdmin && !spinning && (
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={p.weight || 1}
                      title="Peso (a mayor peso, mayor probabilidad)"
                      disabled={saving}
                      onBlur={e => commitWeight(i, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                      style={{
                        width: 56, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid #2a2a40', borderRadius: 4,
                        color: '#9090b0', fontSize: '0.78rem', padding: '3px 6px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {isAdmin && !spinning && (
                    <button
                      onClick={() => removePrize(i)}
                      disabled={saving}
                      title="Eliminar premio"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ff6688', fontSize: '0.8rem', padding: '0 2px',
                        lineHeight: 1, opacity: saving ? 0.4 : 0.7,
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = saving ? '0.4' : '0.7'}
                    >✕</button>
                  )}
                </div>
              );
            })}
          </div>
          {isAdmin && (
            <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#4a4a6a', lineHeight: 1.6 }}>
              El número junto a cada premio es su <b style={{ color: '#6a6a8a' }}>peso</b>: a mayor peso, más probable que salga.
              Un peso de 1 = probabilidad base; 0.5 = la mitad de probable; 2 = el doble. El % se recalcula solo.
            </div>
          )}
        </div>

        {/* Admin: add prize */}
        {isAdmin && (
          <div className="card" style={{ width: '100%', maxWidth: 520 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Agregar premio</div>
            {editMsg && (
              <div style={{ marginBottom: 10, fontSize: '0.85rem', color: editMsg.includes('limina') || editMsg.includes('grega') ? '#00cc66' : '#ff6688' }}>
                {editMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={newPrize}
                onChange={e => setNewPrize(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPrize()}
                placeholder="Nombre del premio..."
                disabled={saving}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={addPrize}
                disabled={saving || !newPrize.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {saving ? '...' : '＋ Agregar'}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#4a4a6a' }}>
              Los cambios se guardan automáticamente y aplican en la próxima partida.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
