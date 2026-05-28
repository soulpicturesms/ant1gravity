import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const PLINKO_MULTIPLIERS = {
  bajo:  [10.0, 2.0, 1.5, 1.1, 0.8, 0.5, 0.5, 0.5, 0.8, 1.1, 1.5, 2.0, 10.0],
  medio: [40.0, 10.0, 3.0, 1.5, 0.8, 0.3, 0.2, 0.3, 0.8, 1.5, 3.0, 10.0, 40.0],
  alto:  [260.0, 30.0, 6.0, 2.0, 0.7, 0.2, 0.0, 0.2, 0.7, 2.0, 6.0, 30.0, 260.0],
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

export default function Plinko({ balance, onBalanceChange, triggerWinAnimation }) {
  const [bet, setBet] = useState(100);
  const [risk, setRisk] = useState('medio');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const flashingPegsRef = useRef(new Map());
  const bucketSplashesRef = useRef(new Map());
  const animRef = useRef(null);

  // New floating texts, sparkles and toast notifications
  const [localToast, setLocalToast] = useState(null);
  const floatingTextsRef = useRef([]);
  const sparklesRef = useRef([]);

  useEffect(() => {
    if (!localToast) return;
    const timer = setTimeout(() => {
      setLocalToast(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [localToast]);

  // Scaled dimensions from design handoff - Upgraded to be taller
  const rows = 12;
  const startY = 60;
  const rowSpacing = 42;
  const pegSpacingX = 38;
  const ballSize = 8;
  const pegSize = 3.5;

  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  // Compute current bet scaling factor
  const betFactor = 1 + Math.min(1.0, Math.log10(bet / 10) * 0.2);

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
      const cx = canvas ? canvas.width / 2 / (window.devicePixelRatio || 1) : 320;
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
    const logicalW = 640;
    const logicalH = 680;
    const cx = logicalW / 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Initialize cosmic background ambient particles
    const ambientParticles = [];
    for (let i = 0; i < 45; i++) {
      ambientParticles.push({
        x: Math.random() * logicalW,
        y: Math.random() * logicalH,
        size: 0.8 + Math.random() * 1.6,
        speedY: 7 + Math.random() * 15,
        amplitude: 0.3 + Math.random() * 0.9,
        frequency: 0.002 + Math.random() * 0.004,
        offset: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.38,
      });
    }

    let lastTime = performance.now();

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      ctx.clearRect(0, 0, logicalW, logicalH);

      ctx.fillStyle = '#0c0c14';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // Draw cosmic background ambient particles
      ambientParticles.forEach(p => {
        p.y -= p.speedY * dt;
        p.x += Math.sin(now * p.frequency + p.offset) * p.amplitude * 0.4;
        if (p.y < -15) {
          p.y = logicalH + 15;
          p.x = Math.random() * logicalW;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        const pulse = 0.5 + 0.5 * Math.sin(now / 600 + p.offset);
        ctx.fillStyle = `rgba(255, 45, 122, ${p.opacity * pulse})`;
        ctx.shadowColor = '#ff2d7a';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.restore();
      });

      // Pegs with breath pulsing animation
      for (let r = 0; r < rows; r++) {
        const K = r + 3;
        for (let k = 0; k < K; k++) {
          const px = cx + (k - (K - 1) / 2) * pegSpacingX;
          const py = startY + r * rowSpacing;
          const flashKey = `${r}-${k}`;
          const isFlashing = flashingPegsRef.current.has(flashKey) && flashingPegsRef.current.get(flashKey) > now;
          
          ctx.beginPath();
          const pulse = 0.5 + 0.5 * Math.sin((now / 800) - (r * 0.22) + (k * 0.12));
          const sizeMod = isFlashing ? pegSize + 2.5 : pegSize + 0.3 * pulse;
          ctx.arc(px, py, sizeMod, 0, 2 * Math.PI);
          
          if (isFlashing) {
            ctx.fillStyle = '#ff2d7a';
            ctx.shadowColor = '#ff2d7a';
            ctx.shadowBlur = 12;
          } else {
            const alpha = 0.18 + 0.24 * pulse;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            if (pulse > 0.75) {
              ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
              ctx.shadowBlur = 3;
            }
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Buckets
      const bucketWidth = pegSpacingX - 4;
      const bucketHeight = 24;
      const bucketY = startY + rows * rowSpacing + 12;
      const mults = PLINKO_MULTIPLIERS[risk];
      
      // Calculate active scaled multipliers for drawing
      const curBetFactor = 1 + Math.min(1.0, Math.log10(betRef.current / 10) * 0.2);

      for (let b = 0; b < 13; b++) {
        const bx = cx + (b - 6) * pegSpacingX - bucketWidth / 2;
        const isSplashed = bucketSplashesRef.current.has(b) && bucketSplashesRef.current.get(b) > now;
        const baseMult = mults[b];
        const scaledMult = parseFloat((baseMult * curBetFactor).toFixed(1));
        const bgColor = getBucketColor(baseMult);
        const txtColor = getBucketTextColor(baseMult);
        
        ctx.save();
        ctx.fillStyle = bgColor;
        const currentY = isSplashed ? bucketY + 4 : bucketY;
        
        // Glowing outline breathes
        const pulse = 0.5 + 0.5 * Math.sin(now / 350 + b * 0.4);
        ctx.shadowColor = txtColor;
        ctx.shadowBlur = isSplashed ? 16 : 4 + 5 * pulse;
        
        ctx.beginPath();
        ctx.roundRect(bx, currentY, bucketWidth, bucketHeight, 4);
        ctx.fill();
        
        ctx.strokeStyle = isSplashed ? txtColor : txtColor + (pulse > 0.5 ? '44' : '22');
        ctx.lineWidth = isSplashed ? 1.5 : 1;
        ctx.stroke();
        
        ctx.fillStyle = txtColor;
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${scaledMult}x`, bx + bucketWidth / 2, currentY + bucketHeight / 2);
        ctx.restore();
      }

      // Balls
      ballsRef.current = ballsRef.current.filter((ball) => {
        const { coords, step, progress } = ball;
        if (step + 1 >= coords.length) {
          onBalanceChange(prev => prev + ball.payout);
          bucketSplashesRef.current.set(ball.bucket, now + 250);
          
          // Win tier evaluation
          let winTier = 'small';
          if (ball.multiplier >= 10.0) winTier = 'big';
          else if (ball.multiplier >= 2.0) winTier = 'medium';
          
          const startX = cx + (ball.bucket - 6) * pegSpacingX;
          const startYVal = bucketY;
          const bucketTxtColor = getBucketTextColor(PLINKO_MULTIPLIERS[risk][ball.bucket]);

          // Local floating win text
          floatingTextsRef.current.push({
            x: startX,
            y: startYVal - 10,
            text: `+${ball.payout.toLocaleString('es-AR')} TK`,
            color: bucketTxtColor,
            size: winTier === 'big' ? 17 : winTier === 'medium' ? 13 : 11,
            opacity: 1.0,
            vy: winTier === 'big' ? -1.5 : winTier === 'medium' ? -2.0 : -2.4,
            life: 1.0,
            tier: winTier
          });

          // Local sparkle/star explosion
          const pCount = winTier === 'big' ? 35 : winTier === 'medium' ? 15 : 6;
          for (let i = 0; i < pCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (winTier === 'big' ? 2.5 : winTier === 'medium' ? 1.8 : 1.0) * (1 + Math.random() * 2.5);
            sparklesRef.current.push({
              x: startX,
              y: startYVal + 10,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - (winTier === 'big' ? 2.2 : 1.2),
              color: bucketTxtColor,
              size: Math.random() * 3 + (winTier === 'big' ? 2.2 : 1.2),
              opacity: 1.0,
              life: 0.6 + Math.random() * 0.6,
              isStar: winTier === 'big' && Math.random() > 0.4
            });
          }

          // Trigger appropriate notification & audio
          if (winTier === 'big') {
            casinoAudio.playWin();
            // Trigger screen-wide celebration
            triggerWinAnimation(ball.payout);
            setLocalToast({
              id: Math.random(),
              text: '¡GRAN GANANCIA!',
              amount: ball.payout,
              type: 'big'
            });
          } else if (winTier === 'medium') {
            casinoAudio.playWin();
            setLocalToast({
              id: Math.random(),
              text: '¡BUENA GANANCIA!',
              amount: ball.payout,
              type: 'medium'
            });
          } else {
            if (ball.multiplier >= 1) {
              casinoAudio.playWin();
            } else {
              casinoAudio.playLose();
            }
          }
          
          return false;
        }
        const p1 = coords[step];
        const p2 = coords[step + 1];
        // Dropping speed is slightly slower (3.2 instead of 3.75) for anticipation
        const nextProgress = progress + 3.2 * dt;
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

      // Update and draw sparkles
      const sparkles = sparklesRef.current;
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.08;
        s.life -= dt;
        s.opacity = Math.max(0, s.life);
        if (s.life <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        
        if (s.isStar) {
          const r = s.size;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - r);
          ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
          ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r);
          ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y);
          ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }

      // Update and draw floating texts
      const fTexts = floatingTextsRef.current;
      for (let i = fTexts.length - 1; i >= 0; i--) {
        const ft = fTexts[i];
        ft.y += ft.vy;
        ft.life -= dt * 1.1;
        ft.opacity = Math.max(0, ft.life);
        if (ft.life <= 0) {
          fTexts.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = ft.opacity;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = ft.tier === 'big' ? 14 : ft.tier === 'medium' ? 8 : 4;
        ctx.textAlign = 'center';
        
        if (ft.tier === 'big') {
          ctx.font = '900 italic 18px Unbounded, system-ui';
        } else if (ft.tier === 'medium') {
          ctx.font = 'bold italic 13px Unbounded, system-ui';
        } else {
          ctx.font = 'bold 11px Inter, system-ui';
        }
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [risk, triggerWinAnimation, onBalanceChange]);

  // Keep a betRef synced for the canvas drawing context
  const betRef = useRef(bet);
  useEffect(() => { betRef.current = bet; }, [bet]);

  const half   = () => setBet(b => Math.max(10, Math.floor(b / 2)));
  const double = () => setBet(b => Math.min(Math.min(balance, 10000), b * 2));
  const setMax = () => setBet(Math.min(balance, 10000));

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">Plinko</div>

        {/* Risk selector */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            Riesgo
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['bajo', 'medio', 'alto'].map(r => (
              <button key={r} onClick={() => setRisk(r)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer',
                background: risk === r ? RISK_COLORS[r] + '18' : 'var(--c-surface2)',
                border: `1px solid ${risk === r ? RISK_COLORS[r] + '55' : 'var(--c-line2)'}`,
                color: risk === r ? RISK_COLORS[r] : 'var(--c-text3)',
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
          <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            Apuesta
          </div>
          <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 46 }}>
              <input
                type="number" min="10" max="10000" value={bet} disabled={loading}
                onChange={e => setBet(Math.max(10, Math.min(10000, parseInt(e.target.value) || 10)))}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--c-text)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.1rem', textAlign: 'right' }}
              />
              <span style={{ color: 'var(--c-text4)', fontSize: '0.68rem', marginLeft: 6 }}>TK</span>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--c-surface2)' }}>
              {[['½', half], ['2×', double], ['MAX', setMax]].map(([label, action], i, arr) => (
                <button key={label} onClick={action} disabled={loading} style={{
                  flex: 1, background: 'none', border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid var(--c-surface2)' : 'none',
                  color: 'var(--c-text3)', padding: '7px 0',
                  fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.72rem',
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.target.style.color = 'var(--c-accent)'; }}
                onMouseLeave={e => { e.target.style.color = 'var(--c-text3)'; }}
                >{label}</button>
              ))}
            </div>
          </div>
          {bet > balance && (
            <div style={{ fontSize: '0.72rem', color: 'var(--c-accent)', marginTop: 5, textAlign: 'center' }}>
              Tokens insuficientes
            </div>
          )}
        </div>

        {err && <div className="casino-err">{err}</div>}

        <button onClick={dropBall} disabled={loading || bet < 10 || bet > balance} className="roul-spin-btn">
          {loading ? 'CARGANDO...' : 'SOLTAR BOLA'}
        </button>

        {/* Multiplier preview */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            Multiplicadores Escalonados
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {PLINKO_MULTIPLIERS[risk].filter((m, i, arr) => arr.indexOf(m) === i).sort((a, b) => b - a).slice(0, 6).map(mult => {
              const scaledMult = parseFloat((mult * betFactor).toFixed(1));
              return (
                <span key={mult} style={{
                  fontSize: '0.72rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: getBucketTextColor(mult),
                  background: getBucketColor(mult),
                  border: `1px solid ${getBucketTextColor(mult)}30`,
                  borderRadius: 5, padding: '2px 7px',
                }}>{scaledMult}x</span>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--c-text4)', lineHeight: 1.6 }}>
          12 filas · 13 canales<br />Los multiplicadores aumentan según el tamaño de tu apuesta.
        </div>
      </div>

      {/* ── RIGHT STAGE ─────────────────────────────── */}
      <div className="casino-roul-stage" style={{ alignItems: 'center' }}>
        <style>{`
          @keyframes toastPopIn {
            0% { transform: translate(-50%, -12px) scale(0.85); opacity: 0; }
            100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          }
        `}</style>
        
        <div style={{
          background: 'var(--c-bg)', border: '1px solid var(--c-line2)',
          borderRadius: 14, padding: '16px 0 16px', overflow: 'hidden',
          position: 'relative', width: '100%',
        }}>
          {localToast && (
            <div style={{
              position: 'absolute',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              background: 'rgba(12, 12, 20, 0.92)',
              border: `1px solid ${localToast.type === 'big' ? '#f5c542' : '#ff2d7a'}`,
              boxShadow: `0 0 15px ${localToast.type === 'big' ? 'rgba(245,197,66,0.4)' : 'rgba(255,45,122,0.4)'}`,
              borderRadius: 10,
              padding: '10px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              zIndex: 10,
              animation: 'toastPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            }}>
              <div style={{
                fontFamily: 'Unbounded, system-ui',
                fontSize: '0.62rem',
                fontWeight: 800,
                color: localToast.type === 'big' ? '#f5c542' : '#ff2d7a',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {localToast.text}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '1.2rem',
                fontWeight: 950,
                color: '#6fff7d',
                textShadow: '0 0 10px rgba(111,255,125,0.4)',
              }}>
                +{localToast.amount.toLocaleString('es-AR')} <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>TK</span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} width={640} height={680} style={{
            display: 'block', margin: '0 auto', width: '100%', height: 'auto', maxWidth: 640,
          }} />
        </div>
      </div>
    </div>
  );
}
