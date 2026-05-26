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

function drawWheel(ctx, prizes, rot) {
  const n = prizes.length;
  if (n < 2) return;
  const arc = (2 * Math.PI) / n;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const rotRad = (rot * Math.PI) / 180;

  for (let i = 0; i < n; i++) {
    const start = rotRad + i * arc - Math.PI / 2;
    const end = rotRad + (i + 1) * arc - Math.PI / 2;
    const mid = rotRad + (i + 0.5) * arc - Math.PI / 2;

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

    if (ctx.measureText(prizes[i]).width <= maxW) {
      ctx.fillText(prizes[i], R - 14, 0);
    } else {
      const words = prizes[i].split(' ');
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

    const n = prizes.length;
    const winIndex = Math.floor(Math.random() * n);
    const segDeg = 360 / n;
    const normalizedTarget = ((-(winIndex + 0.5) * segDeg) % 360 + 360) % 360;
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
        setWinner(currentPrizes[winIndex]);
        setShowWinner(true);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const addPrize = async () => {
    const name = newPrize.trim();
    if (!name) return;
    const updated = [...prizes, name];
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

  if (loading) return <div className="loading"><div className="spinner"></div> Cargando ruleta...</div>;

  return (
    <div className="page">
      <div className="section-header">
        <h2>RULETA</h2>
        <div className="accent-line" />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {prizes.map((p, i) => {
              const isWinner = showWinner && winner === p;
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
                  }}>{p}</span>
                  {isWinner && <span style={{ fontSize: '0.75rem' }}>🏆</span>}
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
