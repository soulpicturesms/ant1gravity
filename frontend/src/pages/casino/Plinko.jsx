import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const T = {
  bg:        '#0c0c14',
  surface:   '#161623',
  panel:     '#1d1d2c',
  border:    'rgba(255,255,255,0.10)',
  text:      '#ecedf4',
  textDim:   '#a5a6b8',
  textFaint: '#4a4b60',
  green:     '#6fff7d',
  red:       '#ff2d7a',
  gold:      '#f5c542',
  accent:    '#ff2d7a',
};

const PLINKO_MULTIPLIERS = {
  bajo:  [5.6, 1.6, 1.2, 1.0, 0.7, 0.5, 0.5, 0.5, 0.7, 1.0, 1.2, 1.6, 5.6],
  medio: [13.0, 4.0, 1.5, 1.1, 0.7, 0.4, 0.2, 0.4, 0.7, 1.1, 1.5, 4.0, 13.0],
  alto:  [33.0, 11.0, 3.0, 1.3, 0.5, 0.2, 0.0, 0.2, 0.5, 1.3, 3.0, 11.0, 33.0],
};

const getBucketColor = (mult) => {
  if (mult <= 0)  return '#1e1e30';
  if (mult < 1)   return '#1e1e30';
  if (mult < 2)   return '#1d2855';
  if (mult < 10)  return '#163b28';
  return '#4a3200';
};

const getBucketTextColor = (mult) => {
  if (mult <= 0)  return '#4a4b60';
  if (mult < 1)   return '#6f7088';
  if (mult < 2)   return '#6699ff';
  if (mult < 10)  return '#6fff7d';
  return '#f5c542';
};

const RISK_LABELS = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };
const RISK_COLORS = { bajo: '#6fff7d', medio: '#f5c542', alto: '#ff2d7a' };

export default function Plinko({ balance, onBalanceChange }) {
  const [bet, setBet] = useState(100);
  const [risk, setRisk] = useState('medio');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const flashingPegsRef = useRef(new Map());
  const bucketSplashesRef = useRef(new Map());
  const animRef = useRef(null);

  const rows = 12;
  const startY = 44;
  const rowSpacing = 30;
  const pegSpacingX = 32;
  const ballSize = 6;
  const pegSize = 3;

  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const dropBall = async () => {
    if (bet < 10) return setErr('Apuesta mínima: 10 tokens');
    if (bet > balanceRef.current) return setErr('Tokens insuficientes');
    setErr('');
    setLoading(true);
    try {
      onBalanceChange(balanceRef.current - bet);
      casinoAudio.playChip();
      const res = await api.casinoPlinko({ bet, risk });
      const canvas = canvasRef.current;
      const cx = canvas ? canvas.width / 2 : 300;
      const k0 = 1;
      const startPos = { x: cx, y: startY - 15 };
      const pathCoords = [startPos];
      let currentK = k0;
      for (let r = 0; r < rows; r++) {
        const px = cx + (currentK - (r + 2) / 2) * pegSpacingX;
        const py = startY + r * rowSpacing;
        pathCoords.push({ x: px, y: py, peg: `${r}-${currentK}` });
        currentK = currentK + res.path[r];
      }
      const finalX = cx + ((res.bucket + 1) - 7) * pegSpacingX;
      const finalY = startY + rows * rowSpacing + 12;
      pathCoords.push({ x: finalX, y: finalY });
      ballsRef.current.push({
        id: Math.random(), path: res.path, coords: pathCoords,
        payout: res.payout, net: res.net, multiplier: res.multiplier,
        bucket: res.bucket, step: 0, progress: 0, x: startPos.x, y: startPos.y,
      });
    } catch (e) {
      setErr(e.message);
      onBalanceChange(balanceRef.current + bet);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const logicalW = 500;
    const logicalH = 480;
    const cx = logicalW / 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    let lastTime = performance.now();

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      ctx.clearRect(0, 0, logicalW, logicalH);

      // Dark background
      ctx.fillStyle = 'rgba(12,12,20,1)';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // Pegs
      for (let r = 0; r < rows; r++) {
        const K = r + 3;
        for (let k = 0; k < K; k++) {
          const px = cx + (k - (K - 1) / 2) * pegSpacingX;
          const py = startY + r * rowSpacing;
          const flashKey = `${r}-${k}`;
          const isFlashing = flashingPegsRef.current.has(flashKey) && flashingPegsRef.current.get(flashKey) > now;
          ctx.beginPath();
          ctx.arc(px, py, isFlashing ? pegSize + 2.5 : pegSize, 0, 2 * Math.PI);
          ctx.fillStyle = isFlashing ? '#ff2d7a' : 'rgba(255,255,255,0.30)';
          if (isFlashing) { ctx.shadowColor = '#ff2d7a'; ctx.shadowBlur = 10; }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Buckets
      const bucketWidth = pegSpacingX - 4;
      const bucketHeight = 24;
      const bucketY = startY + rows * rowSpacing + 12;
      const mults = PLINKO_MULTIPLIERS[risk];
      for (let b = 0; b < 13; b++) {
        const bx = cx + (b - 6) * pegSpacingX - bucketWidth / 2;
        const isSplashed = bucketSplashesRef.current.has(b) && bucketSplashesRef.current.get(b) > now;
        const mult = mults[b];
        const bgColor = getBucketColor(mult);
        const txtColor = getBucketTextColor(mult);
        ctx.save();
        ctx.fillStyle = bgColor;
        const currentY = isSplashed ? bucketY + 4 : bucketY;
        if (isSplashed) { ctx.shadowColor = txtColor; ctx.shadowBlur = 12; }
        ctx.beginPath();
        ctx.roundRect(bx, currentY, bucketWidth, bucketHeight, 4);
        ctx.fill();
        ctx.strokeStyle = isSplashed ? txtColor : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = txtColor;
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mult}x`, bx + bucketWidth / 2, currentY + bucketHeight / 2);
        ctx.restore();
      }

      // Balls
      ballsRef.current = ballsRef.current.filter((ball) => {
        const { coords, step, progress } = ball;
        if (step + 1 >= coords.length) {
          onBalanceChange(prev => prev + ball.payout);
          bucketSplashesRef.current.set(ball.bucket, now + 250);
          ball.multiplier >= 1 ? casinoAudio.playWin() : casinoAudio.playLose();
          return false;
        }
        const p1 = coords[step];
        const p2 = coords[step + 1];
        const nextProgress = progress + 3.75 * dt;
        ball.progress = nextProgress;
        if (nextProgress >= 1) {
          ball.progress = 0;
          ball.step = step + 1;
          if (p2.peg) { flashingPegsRef.current.set(p2.peg, now + 150); casinoAudio.playRouletteTick(); }
        }
        const u = Math.min(nextProgress, 1);
        ball.x = p1.x + (p2.x - p1.x) * u;
        const baseY = p1.y + (p2.y - p1.y) * u;
        ball.y = baseY - 18 * u * Math.pow(1 - u, 2) * 6.75;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballSize, 0, 2 * Math.PI);
        const ballGlow = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ballSize);
        ballGlow.addColorStop(0, '#ffffff');
        ballGlow.addColorStop(0.5, '#ff6aaa');
        ballGlow.addColorStop(1, '#ff2d7a');
        ctx.fillStyle = ballGlow;
        ctx.shadowColor = '#ff2d7a';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [risk]);

  const half   = () => setBet(b => Math.max(10, Math.floor(b / 2)));
  const double = () => setBet(b => Math.min(balance, b * 2));
  const setMax = () => setBet(balance);

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>

      {/* Canvas area */}
      <div style={{
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: '14px 0 10px', overflow: 'hidden', position: 'relative', marginBottom: 10,
      }}>
        <canvas ref={canvasRef} width={500} height={480} style={{
          display: 'block', margin: '0 auto', width: '100%', height: 'auto', maxWidth: 500,
        }} />
      </div>

      {/* Controls panel */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {err && (
          <div style={{
            background: 'rgba(255,45,122,0.10)', border: '1px solid rgba(255,45,122,0.28)',
            borderRadius: 8, padding: '7px 12px', color: '#ff8aaa',
            fontSize: '0.82rem', textAlign: 'center', fontFamily: "'Inter', system-ui",
          }}>
            {err}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Risk */}
          <div>
            <div style={{
              fontSize: '0.6rem', color: T.textFaint, marginBottom: 7,
              fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>RIESGO</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {['bajo', 'medio', 'alto'].map(r => (
                <button key={r} onClick={() => setRisk(r)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 7, cursor: 'pointer',
                  background: risk === r ? RISK_COLORS[r] + '18' : T.panel,
                  border: `1px solid ${risk === r ? RISK_COLORS[r] + '50' : T.border}`,
                  color: risk === r ? RISK_COLORS[r] : T.textDim,
                  fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.75rem',
                  letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s',
                }}>
                  {RISK_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Bet input */}
          <div>
            <div style={{
              fontSize: '0.6rem', color: T.textFaint, marginBottom: 7,
              fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>APUESTA</div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', height: 36 }}>
                <input
                  type="number" min="10" value={bet} disabled={loading}
                  onChange={e => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: T.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem', textAlign: 'right',
                  }}
                />
                <span style={{ color: T.textFaint, fontSize: '0.65rem', fontFamily: "'Inter', system-ui", marginLeft: 5 }}>TK</span>
              </div>
              <div style={{ display: 'flex', borderTop: `1px solid ${T.panel}` }}>
                {[['½', half], ['2×', double], ['MAX', setMax]].map(([label, action], i, arr) => (
                  <button key={label} onClick={action} disabled={loading} style={{
                    flex: 1, background: 'none', border: 'none',
                    borderRight: i < arr.length - 1 ? `1px solid ${T.panel}` : 'none',
                    color: T.textDim, padding: '5px 0',
                    fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.7rem',
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.target.style.color = T.accent; e.target.style.background = T.surface; }}}
                  onMouseLeave={e => { e.target.style.color = T.textDim; e.target.style.background = 'none'; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={dropBall} disabled={loading || bet < 10 || bet > balance} style={{
          height: 48, borderRadius: 10, border: 'none',
          background: loading || bet > balance
            ? T.panel
            : 'linear-gradient(135deg, #ff2d7a, #ff5f4b)',
          color: loading || bet > balance ? T.textFaint : '#fff',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
          cursor: loading || bet > balance ? 'not-allowed' : 'pointer',
          fontFamily: "'Unbounded', system-ui",
          boxShadow: (!loading && bet <= balance) ? '0 4px 20px rgba(255,45,122,0.35)' : 'none',
          transition: 'all 0.2s',
        }}>
          {loading ? 'CARGANDO...' : 'SOLTAR BOLA'}
        </button>

        {bet > balance && (
          <div style={{ fontSize: '0.73rem', color: T.red, fontFamily: "'Inter', system-ui", textAlign: 'center', marginTop: -8 }}>
            Tokens insuficientes
          </div>
        )}
      </div>
    </div>
  );
}
