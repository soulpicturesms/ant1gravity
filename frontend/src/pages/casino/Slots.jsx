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

const SYMBOL_EMOJIS = {
  Wild: '🃏', Seven: '🔥', Diamond: '💎', Bell: '🔔',
  Plum: '🍇', Orange: '🍊', Lemon: '🍋', Cherry: '🍒',
};

const QUICK_BETS = [9, 45, 90, 180, 450, 900];

class CoinParticle {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2 + (Math.random() - 0.5) * 160;
    this.y = canvasHeight - 20;
    this.vx = (Math.random() - 0.5) * 14;
    this.vy = -12 - Math.random() * 12;
    this.gravity = 0.55;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.25;
    this.size = 18 + Math.random() * 14;
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

export default function Slots({ balance, onBalanceChange }) {
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
  const [winningLines, setWinningLines] = useState([]);
  const winningLinesRef = useRef([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const activeLineIndexRef = useRef(-1);

  const colWidth = 116;
  const rowHeight = 90;
  const colCount = 5;
  const rowCount = 3;
  const symbolHeight = 90;

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
      ctx.fillStyle = 'rgba(7,7,12,0.92)';
      ctx.fillRect(0, 0, logicalW, logicalH);

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

        // Reel column separator
        if (c > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(c * colWidth, 0, 1, logicalH);
        }

        const startIndex = Math.floor(reel.offset / symbolHeight);
        const drawOffset = -(reel.offset % symbolHeight);
        for (let r = 0; r < rowCount + 1; r++) {
          const symbolIndex = (startIndex + r) % (reel.symbols.length || 1);
          const symbol = reel.symbols[symbolIndex] || 'Cherry';
          const x = c * colWidth; const y = r * rowHeight + drawOffset;
          ctx.save();
          ctx.font = 'bold 44px Inter, system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (symbol === 'Seven' || symbol === 'Wild') {
            ctx.shadowColor = symbol === 'Seven' ? '#ff2d7a' : '#a855f7'; ctx.shadowBlur = 12;
          } else { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; }
          let emoji = SYMBOL_EMOJIS[symbol] || '🍒';
          if (reel.speed > 16) {
            const steps = 3; const blurAmt = reel.speed * 0.12;
            for (let j = 0; j < steps; j++) {
              ctx.globalAlpha = j === 0 ? 0.5 : 0.15;
              ctx.fillText(emoji, x + colWidth / 2, y + rowHeight / 2 + (j - steps / 2) * blurAmt);
            }
          } else { ctx.fillText(emoji, x + colWidth / 2, y + rowHeight / 2); }
          ctx.restore();
        }
      }

      const lines = winningLinesRef.current; const actIdx = activeLineIndexRef.current;
      if (lines.length > 0) {
        lines.forEach((line, index) => {
          const isActive = index === actIdx;
          ctx.save(); ctx.beginPath();
          const colors = ['#f5c542','#6fff7d','#4dc6ff','#a78bfa','#ff2d7a','#ff7f00','#ff2d7a','#6fff7d','#a855f7'];
          const color = colors[line.lineIndex % colors.length];
          ctx.strokeStyle = color;
          if (isActive) {
            ctx.lineWidth = 5; ctx.shadowColor = color; ctx.shadowBlur = 14;
            ctx.lineWidth = 5 * (1 + Math.sin(Date.now() / 120) * 0.2);
          } else { ctx.lineWidth = 1.5; ctx.globalAlpha = 0.18; }
          line.positions.forEach(([cIndex, rIndex], step) => {
            const px = cIndex * colWidth + colWidth / 2; const py = rIndex * rowHeight + rowHeight / 2;
            step === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          });
          ctx.stroke();
          if (isActive) {
            line.positions.forEach(([cIndex, rIndex]) => {
              const px = cIndex * colWidth + colWidth / 2; const py = rIndex * rowHeight + rowHeight / 2;
              ctx.beginPath(); ctx.arc(px, py, 32, 0, Math.PI * 2);
              ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 10;
              ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill(); ctx.stroke();
            });
            const lastPos = line.positions[line.positions.length - 1];
            const lx = lastPos[0] * colWidth + colWidth / 2; const ly = lastPos[1] * rowHeight + rowHeight / 2;
            ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = color; ctx.shadowBlur = 4; ctx.textAlign = 'center';
            ctx.fillText(`+${line.payout} TK`, Math.min(logicalW - 55, Math.max(55, lx)), ly - 38);
          }
          ctx.restore();
        });
      }

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
        for (let i = 0; i < 150; i++) particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
      } else {
        casinoAudio.playSlotWinLine();
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
  const double = () => { if (!spinning) setBet(b => Math.min(900, b * 2)); };
  const maxBet = () => { if (!spinning) setBet(Math.min(900, Math.max(9, Math.floor(balance / 9) * 9))); };

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>

      {/* Jackpot banner */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '12px 20px', textAlign: 'center', marginBottom: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${T.gold}, #ff6b00, ${T.gold})`,
        }} />
        <div style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
          color: T.textFaint, textTransform: 'uppercase', marginBottom: 3,
          fontFamily: "'Unbounded', system-ui",
        }}>
          JACKPOT GLOBAL
        </div>
        <div style={{
          fontSize: '2rem', fontWeight: 900, color: T.gold,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em',
          textShadow: `0 0 16px ${T.gold}60`,
        }}>
          {jackpot.toLocaleString('es-AR')}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, marginLeft: 6, color: T.textDim, fontFamily: "'Inter', system-ui" }}>TK</span>
        </div>
      </div>

      {/* Reels cabinet */}
      <div style={{
        border: `5px solid ${T.panel}`, borderRadius: 14, overflow: 'hidden',
        boxShadow: `inset 0 0 30px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,45,122,0.12), 0 0 20px rgba(0,0,0,0.5)`,
        background: T.bg, marginBottom: 10, touchAction: 'none', position: 'relative',
      }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 270 }} />
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
              fontSize: '2.8rem', fontWeight: 900, color: T.gold,
              fontFamily: "'Unbounded', system-ui",
              textShadow: `0 0 20px ${T.gold}, 0 0 40px #ff9500`,
              letterSpacing: '0.06em', animation: 'scaleUpPulse 0.5s infinite alternate ease-in-out',
            }}>BIG WIN</div>
            <div style={{ fontSize: '1.2rem', color: T.green, fontWeight: 700, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              +{lastWin.toLocaleString('es-AR')} TK
            </div>
          </div>
        )}

        {showJackpotWon && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,7,12,0.92)', pointerEvents: 'none', animation: 'fadeIn 0.3s forwards',
            border: `3px solid ${T.gold}`, borderRadius: 8,
          }}>
            <div style={{ fontSize: '0.9rem', color: T.red, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: "'Unbounded', system-ui" }}>
              MEGA JACKPOT
            </div>
            <div style={{
              fontSize: '3rem', fontWeight: 900, color: T.gold,
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: `0 0 20px ${T.gold}, 0 0 40px #ff3b30`,
              letterSpacing: '0.06em', animation: 'scaleUpPulse 0.4s infinite alternate ease-in-out',
            }}>
              {lastWin.toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: '1rem', color: T.green, fontWeight: 700, fontFamily: "'Unbounded', system-ui" }}>TOKENS</div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 10,
        textAlign: 'center',
      }}>
        {[
          { label: 'APUESTA', value: bet, color: T.text },
          { label: 'GANANCIA', value: lastWin > 0 ? `+${lastWin}` : '—', color: lastWin > 0 ? T.green : T.textFaint },
          { label: 'SALDO', value: balance.toLocaleString('es-AR'), color: T.green },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: '0.6rem', color: T.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Unbounded', system-ui", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px' }}>
        {err && (
          <div style={{
            background: 'rgba(255,45,122,0.10)', border: '1px solid rgba(255,45,122,0.28)',
            borderRadius: 8, padding: '7px 12px', color: '#ff8aaa',
            fontSize: '0.82rem', textAlign: 'center', marginBottom: 12,
            fontFamily: "'Inter', system-ui",
          }}>
            {err}
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.6rem', color: T.textFaint, fontFamily: "'Unbounded', system-ui", letterSpacing: '0.12em', marginBottom: 6 }}>
            APUESTA · 9 LÍNEAS ACTIVAS
          </div>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 46 }}>
              <span style={{ color: T.textFaint, fontSize: '0.6rem', fontFamily: "'Unbounded', system-ui", marginRight: 8, flexShrink: 0, letterSpacing: '0.08em' }}>TOKENS</span>
              <input
                type="number" min="9" step="9" value={bet} disabled={spinning}
                onChange={e => setBet(Math.max(9, parseInt(e.target.value) || 9))}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: T.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.05rem', textAlign: 'right',
                }}
              />
              <span style={{ color: T.textFaint, fontSize: '0.68rem', fontFamily: "'Inter', system-ui", marginLeft: 6 }}>
                ({(bet / 9).toFixed(1)}/lín)
              </span>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${T.panel}` }}>
              {[['½', half], ['2×', double], ['MAX', maxBet]].map(([label, action], i, arr) => (
                <button key={label} onClick={action} disabled={spinning} style={{
                  flex: 1, background: 'none', border: 'none',
                  borderRight: i < arr.length - 1 ? `1px solid ${T.panel}` : 'none',
                  color: T.textDim, padding: '7px 0',
                  fontFamily: "'Inter', system-ui", fontWeight: 700, fontSize: '0.75rem',
                  cursor: spinning ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!spinning) { e.target.style.color = T.accent; e.target.style.background = T.surface; }}}
                onMouseLeave={e => { e.target.style.color = T.textDim; e.target.style.background = 'none'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick bets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5, marginBottom: 12 }}>
          {QUICK_BETS.map(val => (
            <button key={val} disabled={spinning} onClick={() => setBet(val)} style={{
              padding: '6px 2px', borderRadius: 6,
              background: bet === val ? 'rgba(255,45,122,0.15)' : T.panel,
              border: `1px solid ${bet === val ? 'rgba(255,45,122,0.4)' : T.border}`,
              color: bet === val ? T.accent : T.textDim,
              fontSize: '0.78rem', fontWeight: 700,
              cursor: spinning ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s',
            }}>
              {val}
            </button>
          ))}
        </div>

        {bet > balance && (
          <div style={{ fontSize: '0.73rem', color: T.red, fontFamily: "'Inter', system-ui", textAlign: 'center', marginBottom: 8 }}>
            Tokens insuficientes
          </div>
        )}

        <button onClick={startSpin} disabled={spinning} style={{
          width: '100%', height: 50, borderRadius: 10, border: 'none',
          background: spinning
            ? T.panel
            : 'linear-gradient(135deg, #ff2d7a, #ff5f4b)',
          color: spinning ? T.textFaint : '#fff',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em',
          cursor: spinning ? 'not-allowed' : 'pointer',
          fontFamily: "'Unbounded', system-ui",
          boxShadow: !spinning ? '0 4px 20px rgba(255,45,122,0.35)' : 'none',
          transition: 'all 0.2s',
        }}>
          {spinning ? 'GIRANDO...' : 'GIRAR'}
        </button>
      </div>

      <style>{`
        @keyframes scaleUpPulse {
          0%   { transform: scale(0.96); filter: brightness(0.95); }
          100% { transform: scale(1.04); filter: brightness(1.15); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
