import React, { useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'fp_intro_seen';
const LOGO = '/logo-fullpush-480.png';
const IMPACT_MS = 1350;   // momento en que el escudo golpea
const EXIT_MS = 3900;     // empieza la salida
const DONE_MS = 4700;     // se desmonta

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* sin storage */ }
}

// Brasas que suben + estallido de chispas en el impacto
function useEmbers(canvasRef, active) {
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, raf;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const parts = [];
    const ember = () => ({
      x: Math.random() * w, y: h + 10,
      vx: (Math.random() - 0.5) * 0.4, vy: -(0.6 + Math.random() * 1.6),
      r: 0.6 + Math.random() * 2.2, life: 1, decay: 0.003 + Math.random() * 0.006,
      hue: 18 + Math.random() * 22,
    });
    for (let i = 0; i < 60; i++) { const e = ember(); e.y = Math.random() * h; parts.push(e); }

    let burst = false;
    const start = performance.now();
    const tick = now => {
      const t = now - start;
      if (!burst && t >= IMPACT_MS) {
        burst = true;
        const cx = w / 2, cy = h * 0.42;
        for (let i = 0; i < 160; i++) {
          const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 9;
          parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5,
            r: 0.8 + Math.random() * 2.4, life: 1, decay: 0.008 + Math.random() * 0.014,
            hue: 15 + Math.random() * 35, spark: true });
        }
      }
      if (parts.length < 140 && Math.random() < 0.5) parts.push(ember());

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.spark) { p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.08; }
        else p.vx += Math.sin((p.y + t * 0.05) * 0.02) * 0.02;
        if (p.life <= 0 || p.y < -20) { parts.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${p.hue},100%,70%,${p.life})`);
        g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [canvasRef, active]);
}

export default function IntroSplash() {
  const [stage, setStage] = useState(() => (alreadySeen() ? 'done' : 'play'));
  const canvasRef = useRef(null);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEmbers(canvasRef, stage !== 'done' && !reduced);

  useEffect(() => {
    if (stage === 'done') return;
    markSeen();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const exitAt = reduced ? 1200 : EXIT_MS;
    const doneAt = reduced ? 1700 : DONE_MS;
    const t1 = setTimeout(() => setStage('exit'), exitAt);
    const t2 = setTimeout(() => setStage('done'), doneAt);
    const skip = () => { setStage('exit'); setTimeout(() => setStage('done'), 600); };
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('keydown', skip);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage === 'done']);

  if (stage === 'done') return null;

  const skip = () => { setStage('exit'); setTimeout(() => setStage('done'), 600); };

  return (
    <div className={`fpi ${stage === 'exit' ? 'fpi--exit' : ''} ${reduced ? 'fpi--reduced' : ''}`} onClick={skip} role="presentation">
      <style>{CSS}</style>
      <canvas ref={canvasRef} className="fpi-canvas" />
      <div className="fpi-vignette" />
      <div className="fpi-beam" />
      <div className="fpi-flash" />

      <div className="fpi-stage">
        <div className="fpi-rings">
          <span className="fpi-ring" /><span className="fpi-ring fpi-ring--2" /><span className="fpi-ring fpi-ring--3" />
        </div>
        <div className="fpi-logo-wrap">
          <div className="fpi-halo" />
          <img src={LOGO} alt="FULLPUSH" className="fpi-logo" draggable="false" />
          <div className="fpi-shine" style={{ WebkitMaskImage: `url(${LOGO})`, maskImage: `url(${LOGO})` }} />
        </div>

        <h1 className="fpi-title">
          <span className="fpi-full">FULL</span><span className="fpi-push">PUSH</span>
        </h1>
        <div className="fpi-line" />
        <div className="fpi-sub">ALBION ONLINE · GUILD PORTAL</div>
      </div>

      <button className="fpi-skip" onClick={e => { e.stopPropagation(); skip(); }}>SALTAR ›</button>
    </div>
  );
}

const CSS = `
.fpi { position: fixed; inset: 0; z-index: 99999; background: #050505; overflow: hidden;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  clip-path: circle(150% at 50% 42%); }
.fpi--exit { animation: fpi-iris .8s cubic-bezier(.7,0,.3,1) forwards; }
.fpi-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.fpi-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 42%, rgba(255,90,0,.10) 0%, transparent 45%, rgba(0,0,0,.85) 100%); }

.fpi-beam { position: absolute; left: 50%; top: 0; width: 3px; height: 42%; transform: translateX(-50%) scaleY(0);
  transform-origin: top; background: linear-gradient(to bottom, transparent, #fff 60%, #ff7a1a);
  box-shadow: 0 0 18px 4px rgba(255,122,26,.8), 0 0 60px 12px rgba(255,90,0,.4);
  animation: fpi-beam 1.35s cubic-bezier(.6,0,.4,1) forwards; }
.fpi-flash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 42%, #fff 0%, #ffb070 25%, transparent 65%);
  opacity: 0; pointer-events: none; animation: fpi-flash .9s ease-out 1.33s forwards; }

.fpi-stage { position: relative; display: flex; flex-direction: column; align-items: center; margin-top: -4vh;
  animation: fpi-shake .5s linear 1.35s; }
.fpi-logo-wrap { position: relative; height: clamp(190px, 34vh, 320px); aspect-ratio: 1149 / 1369; }
.fpi-logo { position: relative; z-index: 2; height: 100%; width: 100%; object-fit: contain; display: block;
  opacity: 0; transform: scale(2.6) translateY(-30%); filter: blur(14px) brightness(3);
  animation: fpi-drop .55s cubic-bezier(.55,0,.9,.45) .8s forwards, fpi-float 3s ease-in-out 2.2s infinite; }
.fpi-halo { position: absolute; inset: -30%; z-index: 1; border-radius: 50%; opacity: 0;
  background: radial-gradient(circle, rgba(255,122,26,.55) 0%, rgba(255,77,0,.18) 35%, transparent 65%);
  animation: fpi-halo 2.4s ease-out 1.35s forwards; }
.fpi-shine { position: absolute; inset: 0; z-index: 3; pointer-events: none;
  -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.95) 50%, transparent 65%);
  background-size: 300% 100%; background-position: 150% 0; mix-blend-mode: overlay;
  animation: fpi-shine 1.1s ease-in-out 1.9s forwards; }

.fpi-rings { position: absolute; left: 50%; top: calc(clamp(190px, 34vh, 320px) / 2); pointer-events: none; }
.fpi-ring { position: absolute; left: 0; top: 0; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%;
  border: 3px solid rgba(255,140,40,.9); box-shadow: 0 0 30px rgba(255,100,0,.8), inset 0 0 20px rgba(255,100,0,.5);
  opacity: 0; animation: fpi-ring 1.1s cubic-bezier(.1,.6,.3,1) 1.35s forwards; }
.fpi-ring--2 { border-color: rgba(255,255,255,.7); animation-delay: 1.45s; }
.fpi-ring--3 { border-width: 1px; animation-delay: 1.6s; animation-duration: 1.5s; }

.fpi-title { margin: 3.2vh 0 0; font-family: 'Rajdhani', sans-serif; font-weight: 700; line-height: 1;
  font-size: clamp(3rem, 9vw, 6.5rem); letter-spacing: .18em; display: flex; padding-left: .18em; }
.fpi-full, .fpi-push { display: inline-block; opacity: 0; }
.fpi-full { color: #fff; text-shadow: 0 0 30px rgba(255,255,255,.25); animation: fpi-in-l .7s cubic-bezier(.2,1.4,.4,1) 1.9s forwards; }
.fpi-push { color: #ff7a1a; text-shadow: 0 0 24px rgba(255,122,26,.9), 0 0 70px rgba(255,77,0,.5);
  animation: fpi-in-r .7s cubic-bezier(.2,1.4,.4,1) 1.9s forwards, fpi-pulse 1.6s ease-in-out 2.7s infinite; }
.fpi-line { height: 2px; width: min(420px, 70vw); margin-top: 1.6vh; transform: scaleX(0);
  background: linear-gradient(90deg, transparent, #ff7a1a, #fff, #ff7a1a, transparent);
  box-shadow: 0 0 12px rgba(255,122,26,.8); animation: fpi-line .8s ease-out 2.4s forwards; }
.fpi-sub { margin-top: 1.4vh; font-family: 'Rajdhani', sans-serif; font-size: clamp(.7rem, 1.6vw, .95rem);
  letter-spacing: .5em; color: #9a9a9a; opacity: 0; padding-left: .5em; animation: fpi-sub 1s ease-out 2.7s forwards; }

.fpi-skip { position: absolute; right: 20px; bottom: 20px; background: transparent; border: 1px solid #333;
  color: #888; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: .15em; font-size: .8rem;
  padding: 8px 14px; border-radius: 4px; cursor: pointer; opacity: 0; animation: fpi-sub .4s ease 1s forwards; }
.fpi-skip:hover { color: #ff7a1a; border-color: #ff7a1a; }

@keyframes fpi-beam { 0% { transform: translateX(-50%) scaleY(0); opacity: 1; } 85% { transform: translateX(-50%) scaleY(1); opacity: 1; }
  100% { transform: translateX(-50%) scaleY(1); opacity: 0; } }
@keyframes fpi-flash { 0% { opacity: 0; } 8% { opacity: .95; } 100% { opacity: 0; } }
@keyframes fpi-drop { 0% { opacity: 0; transform: scale(2.6) translateY(-30%); filter: blur(14px) brightness(3); }
  70% { opacity: 1; filter: blur(2px) brightness(1.8); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0) brightness(1)
  drop-shadow(0 0 30px rgba(255,122,26,.55)); } }
@keyframes fpi-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes fpi-halo { 0% { opacity: 0; transform: scale(.4); } 25% { opacity: 1; transform: scale(1.1); } 100% { opacity: .55; transform: scale(1); } }
@keyframes fpi-shine { to { background-position: -150% 0; } }
@keyframes fpi-ring { 0% { opacity: 1; transform: scale(.3); } 100% { opacity: 0; transform: scale(22); } }
@keyframes fpi-shake { 0%,100% { transform: translate(0,0); } 15% { transform: translate(-9px,6px); } 30% { transform: translate(8px,-7px); }
  45% { transform: translate(-6px,-4px); } 60% { transform: translate(5px,5px); } 80% { transform: translate(-2px,2px); } }
@keyframes fpi-in-l { 0% { opacity: 0; transform: translateX(-60vw) skewX(-20deg); filter: blur(8px); }
  100% { opacity: 1; transform: none; filter: none; } }
@keyframes fpi-in-r { 0% { opacity: 0; transform: translateX(60vw) skewX(20deg); filter: blur(8px); }
  100% { opacity: 1; transform: none; filter: none; } }
@keyframes fpi-pulse { 0%,100% { text-shadow: 0 0 24px rgba(255,122,26,.9), 0 0 70px rgba(255,77,0,.5); }
  50% { text-shadow: 0 0 36px rgba(255,150,60,1), 0 0 110px rgba(255,77,0,.8); } }
@keyframes fpi-line { to { transform: scaleX(1); } }
@keyframes fpi-sub { to { opacity: 1; } }
@keyframes fpi-iris { 0% { clip-path: circle(150% at 50% 42%); } 100% { clip-path: circle(0% at 50% 42%); } }

.fpi--reduced *, .fpi--reduced { animation-duration: .01s !important; animation-delay: 0s !important; }
.fpi--reduced.fpi--exit { animation: fpi-fade .5s ease forwards !important; }
@keyframes fpi-fade { to { opacity: 0; } }
`;
