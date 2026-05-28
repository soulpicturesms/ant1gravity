import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const PLINKO_MULTIPLIERS = {
  bajo:  [5.6, 1.6, 1.2, 1.0, 0.7, 0.5, 0.5, 0.5, 0.7, 1.0, 1.2, 1.6, 5.6],
  medio: [13.0, 4.0, 1.5, 1.1, 0.7, 0.4, 0.2, 0.4, 0.7, 1.1, 1.5, 4.0, 13.0],
  alto:  [33.0, 11.0, 3.0, 1.3, 0.5, 0.2, 0.0, 0.2, 0.5, 1.3, 3.0, 11.0, 33.0],
};

const BUCKET_COLORS = {
  losing: '#5c5c6c', // < 1.0
  neutral: '#38bdf8', // >= 1.0 && < 2.0
  winning: '#22c55e', // >= 2.0 && < 10.0
  jackpot: '#eab308', // >= 10.0
};

const getBucketColor = (mult) => {
  if (mult < 1) return BUCKET_COLORS.losing;
  if (mult < 2) return BUCKET_COLORS.neutral;
  if (mult < 10) return BUCKET_COLORS.winning;
  return BUCKET_COLORS.jackpot;
};

const CHIP_VALUES = [10, 50, 100, 500, 1000];
const WHEEL_NUMBERS_LEN = 13; // 13 buckets for 12 rows

export default function Plinko({ balance, onBalanceChange }) {
  const [bet, setBet] = useState(100);
  const [risk, setRisk] = useState('medio'); // 'bajo' | 'medio' | 'alto'
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [muted, setMuted] = useState(casinoAudio.muted);

  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const flashingPegsRef = useRef(new Map());
  const bucketSplashesRef = useRef(new Map());
  const animRef = useRef(null);

  // Settings
  const rows = 12;
  const startY = 44;
  const rowSpacing = 30;
  const pegSpacingX = 32;
  const ballSize = 6;
  const pegSize = 3;

  // Track balance updates client-side to prevent races
  const balanceRef = useRef(balance);
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  // Drop action
  const dropBall = async () => {
    if (bet < 10) return setErr('Apuesta mínima: 10 tokens');
    if (bet > balanceRef.current) return setErr('Tokens insuficientes');
    setErr('');
    setLoading(true);

    try {
      // Deduct bet immediately on client
      const updatedBalance = balanceRef.current - bet;
      onBalanceChange(updatedBalance);
      casinoAudio.playChip();

      const res = await api.casinoPlinko({ bet, risk });

      // Add new ball to references
      const canvas = canvasRef.current;
      const cx = canvas ? canvas.width / 2 : 300;

      // Peg Board starting calculations
      // Row 0 peg index 1 (center)
      const k0 = 1; 
      const startX = cx;
      const startPos = { x: cx, y: startY - 15 };

      // Calculate path coords
      const pathCoords = [startPos];
      let currentK = k0;

      for (let r = 0; r < rows; r++) {
        // Current peg coordinate where it strikes
        const px = cx + (currentK - (r + 2) / 2) * pegSpacingX;
        const py = startY + r * rowSpacing;
        pathCoords.push({ x: px, y: py, peg: `${r}-${currentK}` });

        // Bounce path decision
        const choice = res.path[r];
        currentK = currentK + choice;
      }

      // Final bucket landing coords
      const finalX = cx + ((res.bucket + 1) - 7) * pegSpacingX;
      const finalY = startY + rows * rowSpacing + 12;
      pathCoords.push({ x: finalX, y: finalY });

      // Add ball
      ballsRef.current.push({
        id: Math.random(),
        path: res.path,
        coords: pathCoords,
        payout: res.payout,
        net: res.net,
        multiplier: res.multiplier,
        bucket: res.bucket,
        step: 0,
        progress: 0,
        x: startPos.x,
        y: startPos.y,
      });

    } catch (e) {
      setErr(e.message);
      // Refund client bet on server error
      onBalanceChange(balanceRef.current + bet);
    } finally {
      setLoading(false);
    }
  };

  // Main Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();

      // ── Draw Pegs ──────────────────────────────────────────────────────────
      for (let r = 0; r < rows; r++) {
        const K = r + 3; // number of pegs in this row
        for (let k = 0; k < K; k++) {
          const px = cx + (k - (K - 1) / 2) * pegSpacingX;
          const py = startY + r * rowSpacing;

          const flashKey = `${r}-${k}`;
          const isFlashing = flashingPegsRef.current.has(flashKey) && flashingPegsRef.current.get(flashKey) > now;

          ctx.beginPath();
          ctx.arc(px, py, isFlashing ? pegSize + 2.5 : pegSize, 0, 2 * Math.PI);
          ctx.fillStyle = isFlashing ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
          if (isFlashing) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }

      // ── Draw Buckets ────────────────────────────────────────────────────────
      const bucketWidth = pegSpacingX - 4;
      const bucketHeight = 24;
      const bucketY = startY + rows * rowSpacing + 12;
      const mults = PLINKO_MULTIPLIERS[risk];

      for (let b = 0; b < 13; b++) {
        const bx = cx + (b - 6) * pegSpacingX - bucketWidth / 2;
        const isSplashed = bucketSplashesRef.current.has(b) && bucketSplashesRef.current.get(b) > now;
        
        const mult = mults[b];
        const color = getBucketColor(mult);
        
        ctx.save();
        ctx.fillStyle = color;
        // Make bucket splash (move down slightly and shine)
        const currentY = isSplashed ? bucketY + 4 : bucketY;
        if (isSplashed) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        }

        // Rounded bucket rect
        ctx.beginPath();
        ctx.roundRect(bx, currentY, bucketWidth, bucketHeight, 4);
        ctx.fill();

        // Label multiplier
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mult}x`, bx + bucketWidth / 2, currentY + bucketHeight / 2);
        
        ctx.restore();
      }

      // ── Update and Draw Balls ───────────────────────────────────────────────
      ballsRef.current = ballsRef.current.filter((ball) => {
        const { coords, step, progress } = ball;
        const currentStep = step;
        const nextStep = step + 1;

        if (nextStep >= coords.length) {
          // Ball finished landing!
          // Add payout to balance client-side
          onBalanceChange(prev => prev + ball.payout);
          
          // Trigger bucket splash
          bucketSplashesRef.current.set(ball.bucket, now + 250);

          // Play ending sound
          if (ball.multiplier >= 1) {
            casinoAudio.playWin();
          } else {
            casinoAudio.playLose();
          }
          return false; // remove ball
        }

        // Interpolate position
        const p1 = coords[currentStep];
        const p2 = coords[nextStep];

        // Speed: 0.06 per frame (approx 16 frames per bounce, 270ms)
        const nextProgress = progress + 0.065;
        ball.progress = nextProgress;

        if (nextProgress >= 1) {
          ball.progress = 0;
          ball.step = nextStep;

          // Trigger peg collision visual & sound
          if (p2.peg) {
            flashingPegsRef.current.set(p2.peg, now + 150);
            casinoAudio.playRouletteTick(); // Short click sound for peg bounce
          }
        }

        // Draw parabolic arc for bounce
        const u = Math.min(nextProgress, 1);
        ball.x = p1.x + (p2.x - p1.x) * u;
        const baseLinearY = p1.y + (p2.y - p1.y) * u;
        // Parabolic arc bounce
        const bounceHeight = -10; 
        ball.y = baseLinearY + bounceHeight * Math.sin(u * Math.PI);

        // Draw Ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballSize, 0, 2 * Math.PI);
        const ballGlow = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ballSize);
        ballGlow.addColorStop(0, '#38bdf8');
        ballGlow.addColorStop(0.7, '#0284c7');
        ballGlow.addColorStop(1, '#0369a1');
        ctx.fillStyle = ballGlow;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();

        return true;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [risk]);

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      <div className="card" style={{ border: '1px solid rgba(0,232,80,0.2)', background: 'linear-gradient(135deg, #050b06, #0b1c0e)' }}>
        
        {/* Header & Mute toggle */}
        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' }}>
          <div style={{ width: 32 }} />
          <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: '#00e850', letterSpacing: '0.15em', margin: 0 }}>
            🟢 PLINKO CASINO
          </div>
          <button onClick={() => {
            const nowMuted = casinoAudio.toggleMute();
            setMuted(nowMuted);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={muted ? 'Activar Sonido' : 'Silenciar'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

        {/* Pegboard Canvas */}
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '12px 0', overflow: 'hidden', position: 'relative' }}>
          <canvas ref={canvasRef} width={500} height={480} style={{ display: 'block', margin: '0 auto', width: '100%', height: 'auto', maxWidth: 500 }} />
        </div>

        {/* Controls */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Risk Selection */}
            <div>
              <div style={{ fontSize: '0.72rem', color: '#6a6a8a', marginBottom: 6, fontFamily: 'Rajdhani', letterSpacing: '0.1em', textTransform: 'uppercase' }}>RIESGO</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['bajo', 'medio', 'alto'].map(r => (
                  <button key={r} onClick={() => setRisk(r)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 6, cursor: 'pointer',
                    background: risk === r ? 'rgba(0,232,80,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${risk === r ? '#00e850' : 'rgba(255,255,255,0.1)'}`,
                    color: risk === r ? '#00e850' : '#9090b0',
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
                    transition: 'all 0.15s',
                  }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Chip select */}
            <div>
              <div style={{ fontSize: '0.72rem', color: '#6a6a8a', marginBottom: 6, fontFamily: 'Rajdhani', letterSpacing: '0.1em', textTransform: 'uppercase' }}>APUESTA</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {CHIP_VALUES.map(v => (
                  <button key={v} onClick={() => setBet(v)} style={{
                    flex: 1, height: 32, borderRadius: 6, cursor: 'pointer',
                    background: bet === v ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${bet === v ? '#ffd700' : 'rgba(255,255,255,0.08)'}`,
                    color: bet === v ? '#ffd700' : '#9090b0',
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem',
                    transition: 'all 0.15s',
                  }}>
                    {v >= 1000 ? `${v/1000}K` : v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" type="number" min="10" value={bet} onChange={e => setBet(Number(e.target.value))} style={{ width: 110, textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', padding: '6px 10px' }} />
              <span style={{ fontSize: '0.8rem', color: '#6a6a8a', fontFamily: 'Rajdhani' }}>tokens</span>
            </div>
            
            <button className="btn btn-primary" onClick={dropBall} disabled={loading || bet < 10 || bet > balance} style={{ padding: '10px 42px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', background: 'linear-gradient(135deg, #00cc66, #00aa44)' }}>
              🟢 SOLTAR BOLA
            </button>
          </div>
          {bet > balance && <div style={{ fontSize: '0.78rem', color: '#ef4444', fontFamily: 'Rajdhani', marginTop: 6, textAlign: 'right' }}>Tokens insuficientes</div>}
        </div>
      </div>
    </div>
  );
}
