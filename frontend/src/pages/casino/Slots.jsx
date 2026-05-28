import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const T = {
  bg:        '#07070c',
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

const SYMBOL_EMOJIS = {
  Wild: '🃏', Seven: '🔥', Diamond: '💎', Bell: '🔔',
  Plum: '🍇', Orange: '🍊', Lemon: '🍋', Cherry: '🍒',
};

const QUICK_BETS = [9, 45, 90, 180, 450, 900];

class CoinParticle {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 + (Math.random() - 0.5) * 200;
    this.y = canvasHeight - 20;
    this.vx = (Math.random() - 0.5) * 16;
    this.vy = -14 - Math.random() * 14;
    this.gravity = 0.55;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.25;
    this.size = 20 + Math.random() * 16;
    const rand = Math.random();
    this.emoji = rand > 0.6 ? '🪙' : rand > 0.3 ? '🟡' : '⚡';
  }
  update() { this.x += this.vx; this.vy += this.gravity; this.y += this.vy; this.angle += this.spin; }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,215,0,0.4)'; ctx.shadowBlur = 6;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

export default function Slots({ balance, onBalanceChange, triggerWinAnimation, gameName }) {
  const [bet, setBet] = useState(45);
  const [jackpot, setJackpot] = useState(50000);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [showJackpotWon, setShowJackpotWon] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [err, setErr] = useState('');

  const canvasRef = useRef(null);
  const audioSpinRef = useRef(null);
  const animRef = useRef(null);

  const reelsRef = useRef([
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
  ]);

  const particlesRef = useRef([]);
  const bgParticlesRef = useRef([]); // Background ambient specs
  const [winningLines, setWinningLines] = useState([]);
  const winningLinesRef = useRef([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const activeLineIndexRef = useRef(-1);

  // Scaled dimensions — enlarged from 116x90 to 150x120
  const colWidth = 150;
  const rowHeight = 120;
  const colCount = 5;
  const rowCount = 3;
  const symbolHeight = 120;

  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  useEffect(() => {
    const fetchJackpot = () => { api.casinoSlotsJackpot().then(r => setJackpot(r.jackpot)).catch(() => {}); };
    fetchJackpot();
    const iv = setInterval(fetchJackpot, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const symbolsList = Object.keys(SYMBOL_EMOJIS);
    reelsRef.current.forEach(reel => {
      reel.symbols = Array.from({ length: 25 }, () => symbolsList[Math.floor(Math.random() * symbolsList.length)]);
      reel.offset = 0; reel.state = 'idle'; reel.speed = 0;
    });
  }, []);

  useEffect(() => {
    if (winningLines.length === 0) { setActiveLineIndex(-1); activeLineIndexRef.current = -1; return; }
    if (winningLines.length === 1) { setActiveLineIndex(0); activeLineIndexRef.current = 0; return; }
    setActiveLineIndex(0); activeLineIndexRef.current = 0;
    const iv = setInterval(() => {
      const next = (activeLineIndexRef.current + 1) % winningLinesRef.current.length;
      setActiveLineIndex(next); activeLineIndexRef.current = next;
    }, 1200);
    return () => clearInterval(iv);
  }, [winningLines]);

  useEffect(() => { winningLinesRef.current = winningLines; }, [winningLines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const logicalW = colWidth * colCount;
    const logicalH = rowHeight * rowCount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr; canvas.height = logicalH * dpr;
    ctx.resetTransform(); ctx.scale(dpr, dpr);
    let isDestroyed = false;

    const render = () => {
      if (isDestroyed) return;
      ctx.clearRect(0, 0, logicalW, logicalH);
      ctx.fillStyle = '#0e0e1c';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // Draw golden ambient floating specs in background
      if (bgParticlesRef.current.length < 35) {
        bgParticlesRef.current.push({
          x: Math.random() * logicalW,
          y: logicalH + Math.random() * 20,
          vy: -0.25 - Math.random() * 0.45,
          size: 1.5 + Math.random() * 2.5,
          opacity: 0.15 + Math.random() * 0.4,
          speed: 0.05 + Math.random() * 0.05,
        });
      }

      ctx.save();
      bgParticlesRef.current.forEach((p, idx) => {
        p.y += p.vy;
        p.x += Math.sin(Date.now() * p.speed * 0.1) * 0.15;
        ctx.fillStyle = `rgba(245, 197, 66, ${p.opacity})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.y < -10) {
          bgParticlesRef.current[idx] = {
            x: Math.random() * logicalW,
            y: logicalH + Math.random() * 10,
            vy: -0.25 - Math.random() * 0.45,
            size: 1.5 + Math.random() * 2.5,
            opacity: 0.15 + Math.random() * 0.4,
            speed: 0.05 + Math.random() * 0.05,
          };
        }
      });
      ctx.restore();

      // Draw reels
      for (let c = 0; c < colCount; c++) {
        const reel = reelsRef.current[c];
        if (reel.state === 'spinning') {
          reel.offset += reel.speed;
        } else if (reel.state === 'stopping') {
          const dist = reel.targetOffset - reel.offset;
          if (dist > 0) { reel.speed = Math.max(2, dist * 0.12); reel.offset += reel.speed; }
          else { reel.offset = reel.targetOffset; reel.state = 'bounce'; reel.bounceSpeed = 6.5; casinoAudio.playSlotStop(c); }
        } else if (reel.state === 'bounce') {
          const spring = 0.16; const friction = 0.72;
          const diff = reel.targetOffset - reel.offset;
          reel.bounceSpeed += diff * spring; reel.bounceSpeed *= friction;
          reel.offset += reel.bounceSpeed;
          if (Math.abs(diff) < 0.1 && Math.abs(reel.bounceSpeed) < 0.1) {
            reel.offset = reel.targetOffset; reel.state = 'idle'; reel.speed = 0; reel.bounceSpeed = 0;
          }
        }

        if (c > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(c * colWidth, 0, 1, logicalH);
        }

        const startIndex = Math.floor(reel.offset / symbolHeight);
        const drawOffset = -(reel.offset % symbolHeight);
        for (let r = 0; r < rowCount + 1; r++) {
          const symbolIndex = (startIndex + r) % (reel.symbols.length || 1);
          const symbol = reel.symbols[symbolIndex] || 'Cherry';
          const x = c * colWidth; const y = r * rowHeight + drawOffset;
          
          ctx.save();
          
          // CRITICAL BUG FIX: Reset text fillStyle to solid white so the columns 2-5
          // don't inherit the 5% opacity from the column dividers drawn previously.
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 56px Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          
          if (symbol === 'Seven' || symbol === 'Wild') {
            ctx.shadowColor = symbol === 'Seven' ? '#ff2d7a' : '#a855f7'; ctx.shadowBlur = 14;
          } else { ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3; }
          
          ctx.globalAlpha = 1;
          const emoji = SYMBOL_EMOJIS[symbol] || '🍒';
          
          if (reel.speed > 16) {
            const steps = 3; const blurAmt = reel.speed * 0.12;
            for (let j = 0; j < steps; j++) {
              ctx.globalAlpha = j === 0 ? 0.55 : 0.18;
              ctx.fillText(emoji, x + colWidth / 2, y + rowHeight / 2 + (j - steps / 2) * blurAmt);
            }
          } else {
            ctx.globalAlpha = 1;
            ctx.fillText(emoji, x + colWidth / 2, y + rowHeight / 2);
          }
          ctx.restore();
        }
      }

      // Draw winning lines
      const lines = winningLinesRef.current; const actIdx = activeLineIndexRef.current;
      if (lines.length > 0) {
        lines.forEach((line, index) => {
          const isActive = index === actIdx;
          ctx.save(); ctx.beginPath();
          const colors = ['#f5c542','#6fff7d','#4dc6ff','#a78bfa','#ff2d7a','#ff7f00','#ff2d7a','#6fff7d','#a855f7'];
          const color = colors[line.lineIndex % colors.length];
          ctx.strokeStyle = color;
          if (isActive) {
            ctx.lineWidth = 5 * (1 + Math.sin(Date.now() / 120) * 0.2);
            ctx.shadowColor = color; ctx.shadowBlur = 14;
          } else { ctx.lineWidth = 1.5; ctx.globalAlpha = 0.18; }
          line.positions.forEach(([cIndex, rIndex], step) => {
            const px = cIndex * colWidth + colWidth / 2; const py = rIndex * rowHeight + rowHeight / 2;
            step === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          });
          ctx.stroke();
          if (isActive) {
            line.positions.forEach(([cIndex, rIndex]) => {
              const px = cIndex * colWidth + colWidth / 2; const py = rIndex * rowHeight + rowHeight / 2;
              ctx.beginPath(); ctx.arc(px, py, 42, 0, Math.PI * 2);
              ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 10;
              ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill(); ctx.stroke();
            });
            const lastPos = line.positions[line.positions.length - 1];
            const lx = lastPos[0] * colWidth + colWidth / 2; const ly = lastPos[1] * rowHeight + rowHeight / 2;
            ctx.font = 'bold 13px Arial, sans-serif'; ctx.fillStyle = color; ctx.shadowBlur = 4; ctx.textAlign = 'center';
            ctx.fillText(`+${line.payout} TK`, Math.min(logicalW - 55, Math.max(55, lx)), ly - 50);
          }
          ctx.restore();
        });
      }

      // Draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.update(); p.draw(ctx);
        if (p.y > logicalH + 50) particles.splice(i, 1);
      }
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { isDestroyed = true; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [winningLines]);

  const handleSpinFinish = (res) => {
    if (audioSpinRef.current) { audioSpinRef.current.stop(); audioSpinRef.current = null; }
    if (!res) return;
    setJackpot(res.jackpotAmount);
    if (res.payout > 0) {
      setLastWin(res.payout); onBalanceChange(res.balance); setWinningLines(res.winningLines);
      if (res.jackpotWon) {
        setShowJackpotWon(true); casinoAudio.playJackpotSiren();
        triggerWinAnimation(res.payout);
        for (let i = 0; i < 150; i++) particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
      } else {
        casinoAudio.playSlotWinLine();
        triggerWinAnimation(res.payout);
        if (res.payout >= bet * 2) {
          setShowBigWin(true);
          for (let i = 0; i < 60; i++) particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
        } else {
          for (let i = 0; i < 15; i++) particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
        }
      }
    } else { setLastWin(0); casinoAudio.playLose(); }
    setSpinning(false);
  };

  const startSpin = async () => {
    if (spinning) return;
    if (bet < 9) return setErr('Apuesta mínima: 9 tokens (1 por línea)');
    if (bet > balanceRef.current) return setErr('Tokens insuficientes');
    setErr(''); setSpinning(true); setWinningLines([]); setLastWin(0); setShowJackpotWon(false); setShowBigWin(false);
    onBalanceChange(balanceRef.current - bet);
    if (audioSpinRef.current) audioSpinRef.current.stop();
    audioSpinRef.current = casinoAudio.playSlotSpin();
    reelsRef.current.forEach(reel => { reel.state = 'spinning'; reel.speed = 32 + Math.random() * 8; });
    try {
      const res = await api.casinoSlotsSpin({ bet });
      reelsRef.current.forEach((reel, i) => {
        setTimeout(() => {
          const colSymbols = res.reels[i];
          const currentUnit = Math.floor(reel.offset / symbolHeight);
          const targetUnit = currentUnit + 22 + i * 11;
          while (reel.symbols.length < targetUnit + 4) {
            const sl = Object.keys(SYMBOL_EMOJIS);
            reel.symbols.push(sl[Math.floor(Math.random() * sl.length)]);
          }
          reel.symbols[targetUnit] = colSymbols[0];
          reel.symbols[targetUnit + 1] = colSymbols[1];
          reel.symbols[targetUnit + 2] = colSymbols[2];
          reel.targetOffset = targetUnit * symbolHeight; reel.state = 'stopping';
          if (i === 4) {
            const check = setInterval(() => {
              if (reelsRef.current[4].state === 'idle') { clearInterval(check); handleSpinFinish(res); }
            }, 60);
          }
        }, 400 + i * 400);
      });
    } catch (e) {
      setErr(e.message); onBalanceChange(balanceRef.current + bet); setSpinning(false);
      if (audioSpinRef.current) { audioSpinRef.current.stop(); audioSpinRef.current = null; }
      reelsRef.current.forEach(reel => { reel.state = 'idle'; reel.speed = 0; });
    }
  };

  const half   = () => { if (!spinning) setBet(b => Math.max(9, Math.floor(b / 2) - (Math.floor(b / 2) % 9))); };
  const double = () => { if (!spinning) setBet(b => Math.min(9999, b * 2)); };
  const maxBet = () => { if (!spinning) setBet(Math.min(9999, Math.max(9, Math.floor(balance / 9) * 9))); };

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">{gameName || 'Slots Pro'}</div>

        {/* Jackpot */}
        <div style={{
          background: 'rgba(245,197,66,0.06)', border: '1px solid rgba(245,197,66,0.2)',
          borderRadius: 10, padding: '10px 14px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, #f5c542, #ff6b00, #f5c542)',
          }} />
          <div style={{
            fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em',
            color: 'var(--c-text4)', textTransform: 'uppercase', marginBottom: 3,
            fontFamily: "'Unbounded', system-ui",
          }}>JACKPOT GLOBAL</div>
          <div style={{
            fontSize: '1.6rem', fontWeight: 900, color: '#f5c542',
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: '0 0 16px rgba(245,197,66,0.6)',
          }}>
            {jackpot.toLocaleString('es-AR')}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: 5, color: 'var(--c-text3)', fontFamily: "'Inter', system-ui" }}>TK</span>
          </div>
        </div>

        {/* Last win */}
        {lastWin > 0 && (
          <div style={{
            background: 'rgba(111,255,125,0.08)', border: '1px solid rgba(111,255,125,0.25)',
            borderRadius: 8, padding: '8px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--c-text4)', letterSpacing: '0.15em', fontFamily: "'Unbounded', system-ui", marginBottom: 2, textTransform: 'uppercase' }}>Ganancia</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6fff7d', fontFamily: "'JetBrains Mono', monospace" }}>
              +{lastWin.toLocaleString('es-AR')} TK
            </div>
          </div>
        )}

        {/* Bet input */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            Apuesta · 9 líneas
          </div>
          <div style={{ background: 'var(--c-bg1)', border: '1px solid var(--c-line2)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 46 }}>
              <input
                type="number" min="9" step="9" max="9999" value={bet} disabled={spinning}
                onChange={e => setBet(Math.max(9, Math.min(9999, parseInt(e.target.value) || 9)))}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--c-text)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.1rem', textAlign: 'right' }}
              />
              <span style={{ color: 'var(--c-text4)', fontSize: '0.68rem', marginLeft: 6 }}>TK</span>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--c-surface2)' }}>
              {[['½', half], ['2×', double], ['MAX', maxBet]].map(([label, action], i, arr) => (
                <button key={label} onClick={action} disabled={spinning} style={{
                  flex: 1, background: 'none', border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid var(--c-surface2)' : 'none',
                  color: 'var(--c-text3)', padding: '7px 0',
                  fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.72rem',
                  cursor: spinning ? 'not-allowed' : 'pointer', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!spinning) e.target.style.color = 'var(--c-accent)'; }}
                onMouseLeave={e => { e.target.style.color = 'var(--c-text3)'; }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick bets */}
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--c-text4)', fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            Apuesta rápida
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {QUICK_BETS.map(val => (
              <button key={val} disabled={spinning} onClick={() => setBet(val)} style={{
                padding: '7px 4px', borderRadius: 7,
                background: bet === val ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                border: `1px solid ${bet === val ? 'rgba(255,45,122,0.4)' : 'var(--c-line2)'}`,
                color: bet === val ? 'var(--c-accent)' : 'var(--c-text3)',
                fontSize: '0.8rem', fontWeight: 700, cursor: spinning ? 'not-allowed' : 'pointer',
                fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s',
              }}>{val}</button>
            ))}
          </div>
        </div>

        {bet > balance && (
          <div style={{ fontSize: '0.72rem', color: 'var(--c-accent)', textAlign: 'center' }}>
            Tokens insuficientes
          </div>
        )}

        {err && <div className="casino-err">{err}</div>}

        <button onClick={startSpin} disabled={spinning || bet > balance} className="roul-spin-btn">
          {spinning ? 'GIRANDO...' : 'GIRAR'}
        </button>

        <div style={{ fontSize: 10, color: 'var(--c-text4)', lineHeight: 1.6 }}>
          9 líneas activas · Wild multiplica<br />Jackpot acumulativo global
        </div>
      </div>

      {/* ── RIGHT STAGE ─────────────────────────────── */}
      <div className="casino-roul-stage" style={{ flexDirection: 'column', gap: 10, alignItems: 'center' }}>

        {/* Reels cabinet */}
        <div className="slots-cabinet slots-cabinet-idle" style={{
          border: '5px solid var(--c-surface2)', borderRadius: 14, overflow: 'hidden',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,45,122,0.12), 0 0 20px rgba(0,0,0,0.5)',
          background: '#07070c', touchAction: 'none', position: 'relative',
          width: '100%', maxWidth: '750px', aspectRatio: '750/360', margin: '0 auto',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            boxShadow: 'inset 0 18px 28px rgba(0,0,0,0.9), inset 0 -18px 28px rgba(0,0,0,0.9)',
          }} />

          {showBigWin && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)', pointerEvents: 'none', animation: 'fadeIn 0.3s forwards',
            }}>
              <div style={{
                fontSize: '2.8rem', fontWeight: 900, color: '#f5c542',
                fontFamily: "'Unbounded', system-ui",
                textShadow: '0 0 20px #f5c542, 0 0 40px #ff9500',
                letterSpacing: '0.06em', animation: 'scaleUpPulse 0.5s infinite alternate ease-in-out',
              }}>BIG WIN</div>
              <div style={{ fontSize: '1.2rem', color: '#6fff7d', fontWeight: 700, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                +{lastWin.toLocaleString('es-AR')} TK
              </div>
            </div>
          )}

          {showJackpotWon && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(7,7,12,0.92)', pointerEvents: 'none', animation: 'fadeIn 0.3s forwards',
              border: '3px solid #f5c542', borderRadius: 8,
            }}>
              <div style={{ fontSize: '0.9rem', color: '#ff2d7a', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: "'Unbounded', system-ui" }}>
                MEGA JACKPOT
              </div>
              <div style={{
                fontSize: '3rem', fontWeight: 900, color: '#f5c542',
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: '0 0 20px #f5c542, 0 0 40px #ff3b30',
                letterSpacing: '0.06em', animation: 'scaleUpPulse 0.4s infinite alternate ease-in-out',
              }}>
                {lastWin.toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: '1rem', color: '#6fff7d', fontWeight: 700, fontFamily: "'Unbounded', system-ui" }}>TOKENS</div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
          background: 'var(--c-surface)', border: '1px solid var(--c-line2)',
          borderRadius: 12, padding: '10px 14px', textAlign: 'center', width: '100%',
        }}>
          {[
            { label: 'APUESTA',  value: bet,                                  color: 'var(--c-text)' },
            { label: 'GANANCIA', value: lastWin > 0 ? `+${lastWin}` : '—',   color: lastWin > 0 ? '#6fff7d' : 'var(--c-text4)' },
            { label: 'SALDO',    value: balance.toLocaleString('es-AR'),      color: '#6fff7d' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: '0.58rem', color: 'var(--c-text4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Unbounded', system-ui", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scaleUpPulse {
          0%   { transform: scale(0.96); filter: brightness(0.95); }
          100% { transform: scale(1.04); filter: brightness(1.15); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slotsCabinetIdle {
          0%, 100% {
            box-shadow: inset 0 0 30px rgba(0,0,0,0.95), 0 0 15px rgba(255,45,122,0.3);
            border-color: var(--c-surface2);
          }
          50% {
            box-shadow: inset 0 0 30px rgba(0,0,0,0.95), 0 0 35px rgba(255,45,122,0.7), 0 0 10px rgba(111,255,125,0.4);
            border-color: var(--c-accent);
          }
        }
        .slots-cabinet-idle {
          animation: slotsCabinetIdle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
