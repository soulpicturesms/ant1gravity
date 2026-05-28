import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const SYMBOL_EMOJIS = {
  Wild: '🃏',
  Seven: '🔥', // Usamos fuego para Seven para que se vea más pro, o texto estilizado
  Diamond: '💎',
  Bell: '🔔',
  Plum: '🍇',
  Orange: '🍊',
  Lemon: '🍋',
  Cherry: '🍒'
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
    // Emojis de monedas y premios
    const rand = Math.random();
    this.emoji = rand > 0.6 ? '🪙' : rand > 0.3 ? '🟡' : '⚡';
  }

  update() {
    this.x += this.vx;
    this.vy += this.gravity;
    this.y += this.vy;
    this.angle += this.spin;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 6;
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
  const [muted, setMuted] = useState(casinoAudio.muted);

  const canvasRef = useRef(null);
  const audioSpinRef = useRef(null);
  const animRef = useRef(null);
  
  // Referencias a los carretes para la simulación física
  const reelsRef = useRef([
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 },
    { symbols: [], offset: 0, speed: 0, state: 'idle', targetOffset: 0, bounceSpeed: 0 }
  ]);

  // Lista de partículas de monedas
  const particlesRef = useRef([]);

  // Líneas ganadoras resultantes y ciclo de iluminación
  const [winningLines, setWinningLines] = useState([]);
  const winningLinesRef = useRef([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const activeLineIndexRef = useRef(-1);

  // Parámetros de cuadrícula
  const colWidth = 116;
  const rowHeight = 90;
  const colCount = 5;
  const rowCount = 3;
  const symbolHeight = 90; // altura unitaria

  // Balance persistente para evitar race conditions
  const balanceRef = useRef(balance);
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  // Obtener Jackpot inicial y configurar pooling cada 5 seg
  useEffect(() => {
    const fetchJackpot = () => {
      api.casinoSlotsJackpot()
        .then(res => setJackpot(res.jackpot))
        .catch(() => {});
    };
    fetchJackpot();
    const interval = setInterval(fetchJackpot, 5000);
    return () => clearInterval(interval);
  }, []);

  // Inicializar símbolos aleatorios en los carretes al montar
  useEffect(() => {
    const symbolsList = Object.keys(SYMBOL_EMOJIS);
    reelsRef.current.forEach(reel => {
      // Rellenamos el carrete con 20 símbolos aleatorios iniciales
      reel.symbols = Array.from({ length: 25 }, () => {
        const randIndex = Math.floor(Math.random() * symbolsList.length);
        return symbolsList[randIndex];
      });
      reel.offset = 0;
      reel.state = 'idle';
      reel.speed = 0;
    });
  }, []);

  // Ciclo para alternar la línea ganadora que se destaca
  useEffect(() => {
    if (winningLines.length === 0) {
      setActiveLineIndex(-1);
      activeLineIndexRef.current = -1;
      return;
    }
    
    // Si sólo hay una, dejarla fija
    if (winningLines.length === 1) {
      setActiveLineIndex(0);
      activeLineIndexRef.current = 0;
      return;
    }

    // Si hay varias, ciclar cada 1.2 segundos
    setActiveLineIndex(0);
    activeLineIndexRef.current = 0;
    const interval = setInterval(() => {
      const nextIndex = (activeLineIndexRef.current + 1) % winningLinesRef.current.length;
      setActiveLineIndex(nextIndex);
      activeLineIndexRef.current = nextIndex;
    }, 1200);

    return () => clearInterval(interval);
  }, [winningLines]);

  // Mantener referencia actualizada de líneas para el bucle Canvas
  useEffect(() => {
    winningLinesRef.current = winningLines;
  }, [winningLines]);

  // Bucle de renderizado Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const logicalW = colWidth * colCount; // 116 * 5 = 580
    const logicalH = rowHeight * rowCount; // 90 * 3 = 270

    // Escalar para High-DPI pantallas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    let isDestroyed = false;

    const render = () => {
      if (isDestroyed) return;

      // Limpiar lienzo
      ctx.clearRect(0, 0, logicalW, logicalH);

      // Dibujar fondo de cuadrículas detrás de los símbolos
      ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // ── DIBUJAR CARRETES Y SÍMBOLOS ──
      for (let c = 0; c < colCount; c++) {
        const reel = reelsRef.current[c];
        
        // Actualizar física según el estado
        if (reel.state === 'spinning') {
          reel.offset += reel.speed;
        } else if (reel.state === 'stopping') {
          const dist = reel.targetOffset - reel.offset;
          if (dist > 0) {
            reel.speed = Math.max(2, dist * 0.12);
            reel.offset += reel.speed;
          } else {
            reel.offset = reel.targetOffset;
            reel.state = 'bounce';
            reel.bounceSpeed = 6.5; // Empuje de rebote inicial
            casinoAudio.playSlotStop(c);
          }
        } else if (reel.state === 'bounce') {
          const spring = 0.16;
          const friction = 0.72;
          const diff = reel.targetOffset - reel.offset;
          reel.bounceSpeed += diff * spring;
          reel.bounceSpeed *= friction;
          reel.offset += reel.bounceSpeed;

          // Detener el rebote si está muy cerca de alinearse
          if (Math.abs(diff) < 0.1 && Math.abs(reel.bounceSpeed) < 0.1) {
            reel.offset = reel.targetOffset;
            reel.state = 'idle';
            reel.speed = 0;
            reel.bounceSpeed = 0;
          }
        }

        // Calcular índices de símbolos a dibujar basados en el offset
        const startIndex = Math.floor(reel.offset / symbolHeight);
        const drawOffset = -(reel.offset % symbolHeight);

        // Dibujar 4 símbolos para cubrir la entrada superior y salida inferior del carrete
        for (let r = 0; r < rowCount + 1; r++) {
          const symbolIndex = (startIndex + r) % (reel.symbols.length || 1);
          const symbol = reel.symbols[symbolIndex] || 'Cherry';
          
          const x = c * colWidth;
          const y = r * rowHeight + drawOffset;

          // Dibujar fondo de cada celda
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, colWidth, rowHeight);

          // Renderizar el símbolo
          ctx.save();
          ctx.font = 'bold 44px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Efecto de neón para Seven (Fuego) y Wild
          if (symbol === 'Seven' || symbol === 'Wild') {
            ctx.shadowColor = symbol === 'Seven' ? '#ff3b30' : '#d946ef';
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
          }

          let emoji = SYMBOL_EMOJIS[symbol] || '🍒';
          if (symbol === 'Seven') emoji = '🔥'; // Usar 🔥 como Seven por estética

          // Efecto de desenfoque de movimiento (Motion Blur) al girar rápido
          if (reel.speed > 16) {
            const steps = 3;
            const blurAmt = reel.speed * 0.12;
            for (let j = 0; j < steps; j++) {
              ctx.globalAlpha = j === 0 ? 0.5 : 0.15;
              const yBlur = y + rowHeight / 2 + (j - steps / 2) * blurAmt;
              ctx.fillText(emoji, x + colWidth / 2, yBlur);
            }
          } else {
            // Dibujar normal
            ctx.fillText(emoji, x + colWidth / 2, y + rowHeight / 2);
          }
          ctx.restore();
        }
      }

      // ── DIBUJAR LÍNEAS GANADORAS ──
      const lines = winningLinesRef.current;
      const actIdx = activeLineIndexRef.current;
      if (lines.length > 0) {
        lines.forEach((line, index) => {
          const isActive = index === actIdx;
          ctx.save();
          ctx.beginPath();

          // Configurar color de línea de neón
          const colors = [
            '#ffd700', // Dorado
            '#00e850', // Verde
            '#00d4ff', // Celeste
            '#a78bfa', // Violeta
            '#ff3b30', // Rojo
            '#ff007f', // Fucsia
            '#00e8c0', // Turquesa
            '#ff9500', // Naranja
            '#a855f7'  // Púrpura
          ];
          const color = colors[line.lineIndex % colors.length];
          ctx.strokeStyle = color;
          
          if (isActive) {
            ctx.lineWidth = 5;
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            // Efecto de latido / pulsación
            const pulse = 1 + Math.sin(Date.now() / 120) * 0.2;
            ctx.lineWidth = 5 * pulse;
          } else {
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.18; // Atenuar las líneas inactivas
          }

          // Conectar las celdas ganadoras
          line.positions.forEach(([cIndex, rIndex], step) => {
            const cx = cIndex * colWidth + colWidth / 2;
            const cy = rIndex * rowHeight + rowHeight / 2;
            if (step === 0) {
              ctx.moveTo(cx, cy);
            } else {
              ctx.lineTo(cx, cy);
            }
          });

          ctx.stroke();

          // Dibujar un círculo brillante sobre los símbolos ganadores
          if (isActive) {
            line.positions.forEach(([cIndex, rIndex]) => {
              const cx = cIndex * colWidth + colWidth / 2;
              const cy = rIndex * rowHeight + rowHeight / 2;
              ctx.beginPath();
              ctx.arc(cx, cy, 32, 0, Math.PI * 2);
              ctx.strokeStyle = color;
              ctx.lineWidth = 2.5;
              ctx.shadowColor = color;
              ctx.shadowBlur = 10;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
              ctx.fill();
              ctx.stroke();
            });

            // Dibujar cartel de premio de esta línea
            const lastPos = line.positions[line.positions.length - 1];
            const lx = lastPos[0] * colWidth + colWidth / 2;
            const ly = lastPos[1] * rowHeight + rowHeight / 2;
            ctx.font = 'bold 12px Rajdhani';
            ctx.fillStyle = color;
            ctx.shadowBlur = 4;
            ctx.textAlign = 'center';
            ctx.fillText(
              `+${line.payout} tokens`,
              Math.min(logicalW - 55, Math.max(55, lx)),
              ly - 38
            );
          }
          ctx.restore();
        });
      }

      // ── ACTUALIZAR Y DIBUJAR MONEDAS / PARTÍCULAS ──
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);

        // Eliminar partículas que caen fuera de la pantalla
        if (p.y > logicalH + 50) {
          particles.splice(i, 1);
        }
      }

      // Solicitar el siguiente frame
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isDestroyed = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [winningLines]);

  // Manejar el final de las animaciones de parada de todos los carretes
  const handleSpinFinish = (res) => {
    // Apagar el zumbido de giro
    if (audioSpinRef.current) {
      audioSpinRef.current.stop();
      audioSpinRef.current = null;
    }

    if (!res) return;

    setJackpot(res.jackpotAmount);

    if (res.payout > 0) {
      setLastWin(res.payout);
      onBalanceChange(res.balance);
      setWinningLines(res.winningLines);
      
      // Activar sonidos de victoria
      if (res.jackpotWon) {
        setShowJackpotWon(true);
        casinoAudio.playJackpotSiren();
        // Generar una tormenta de partículas de monedas
        for (let i = 0; i < 150; i++) {
          particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
        }
      } else {
        casinoAudio.playSlotWinLine();
        const isBig = res.payout >= bet * 2;
        if (isBig) {
          setShowBigWin(true);
          // Generar bastantes monedas
          for (let i = 0; i < 60; i++) {
            particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
          }
        } else {
          // Generar poquitas monedas
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push(new CoinParticle(colWidth * colCount, rowHeight * rowCount));
          }
        }
      }
    } else {
      setLastWin(0);
      casinoAudio.playLose();
    }

    setSpinning(false);
  };

  // Acción de GIRAR
  const startSpin = async () => {
    if (spinning) return;
    if (bet < 9) return setErr('Apuesta mínima: 9 tokens (1 por línea)');
    if (bet > balanceRef.current) return setErr('Tokens insuficientes');

    setErr('');
    setSpinning(true);
    setWinningLines([]);
    setLastWin(0);
    setShowJackpotWon(false);
    setShowBigWin(false);

    // Deducir saldo localmente de inmediato para mejor responsividad
    onBalanceChange(balanceRef.current - bet);

    // Iniciar sonido de giro de carrete
    if (audioSpinRef.current) audioSpinRef.current.stop();
    audioSpinRef.current = casinoAudio.playSlotSpin();

    // Arrancar giros a alta velocidad con fases de tiempos escalonadas
    reelsRef.current.forEach((reel, i) => {
      reel.state = 'spinning';
      reel.speed = 32 + Math.random() * 8; // velocidad aleatoria rápida
    });

    try {
      const res = await api.casinoSlotsSpin({ bet });
      
      // Programar paradas progresivas de izquierda a derecha (0.5s a 2.1s)
      reelsRef.current.forEach((reel, i) => {
        setTimeout(() => {
          const colSymbols = res.reels[i];
          const currentY = reel.offset;
          
          // Calcular un índice objetivo futuro
          const currentUnit = Math.floor(currentY / symbolHeight);
          // Detención secuencial con distancias mínimas incrementales
          const targetUnit = currentUnit + 22 + i * 11;

          // Inyectar los símbolos reales del backend en la posición de parada
          // Aseguramos que el array tenga tamaño suficiente
          while (reel.symbols.length < targetUnit + 4) {
            const symbolsList = Object.keys(SYMBOL_EMOJIS);
            reel.symbols.push(symbolsList[Math.floor(Math.random() * symbolsList.length)]);
          }

          reel.symbols[targetUnit] = colSymbols[0];
          reel.symbols[targetUnit + 1] = colSymbols[1];
          reel.symbols[targetUnit + 2] = colSymbols[2];

          reel.targetOffset = targetUnit * symbolHeight;
          reel.state = 'stopping';
          
          // Si es el último carrete, preparar trigger para procesar resultados al terminar su rebote
          if (i === 4) {
            const checkEnd = setInterval(() => {
              if (reelsRef.current[4].state === 'idle') {
                clearInterval(checkEnd);
                handleSpinFinish(res);
              }
            }, 60);
          }
        }, 400 + i * 400); // 400ms, 800ms, 1200ms, 1600ms, 2000ms
      });

    } catch (e) {
      setErr(e.message);
      // Devolver saldo al usuario si ocurre un error del servidor
      onBalanceChange(balanceRef.current + bet);
      setSpinning(false);
      if (audioSpinRef.current) {
        audioSpinRef.current.stop();
        audioSpinRef.current = null;
      }
      reelsRef.current.forEach(reel => {
        reel.state = 'idle';
        reel.speed = 0;
      });
    }
  };

  // Modificadores de apuesta
  const adjustBet = (amount) => {
    if (spinning) return;
    const newBet = Math.max(9, bet + amount);
    setBet(newBet);
  };

  const setBetDirect = (val) => {
    if (spinning) return;
    setBet(val);
  };

  const handleMaxBet = () => {
    if (spinning) return;
    // Apuesta máxima sugerida es 900 o todo el balance disponible (redondeado a múltiplos de 9)
    const maxPoss = Math.floor(balance / 9) * 9;
    const limit = Math.min(900, Math.max(9, maxPoss));
    setBet(limit);
  };

  const toggleMuted = () => {
    const isMuted = casinoAudio.toggleMute();
    setMuted(isMuted);
    if (isMuted && audioSpinRef.current) {
      audioSpinRef.current.stop();
      audioSpinRef.current = null;
    }
  };

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', fontFamily: 'Rajdhani', color: 'white', padding: '0 10px' }}>
      
      {/* JACKPOT DISPLAY */}
      <div style={{
        background: 'linear-gradient(180deg, #1e0b36, #0a0518)',
        border: '2px solid #ffd700',
        borderRadius: 16,
        padding: '12px 20px',
        textAlign: 'center',
        marginBottom: 20,
        boxShadow: '0 0 20px rgba(255, 215, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Luces decorativas */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #ffd700, #ff3b30, #ffd700)',
          animation: 'pulsate 2s infinite linear'
        }} />

        <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.25em', color: '#ff3b30', textTransform: 'uppercase', marginBottom: 2 }}>
          ⚡ Pozo Jackpot Global ⚡
        </div>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#ffd700',
          textShadow: '0 0 12px rgba(255, 215, 0, 0.8), 0 0 24px rgba(255, 59, 48, 0.4)',
          letterSpacing: '0.08em',
          lineHeight: 1.1
        }}>
          {jackpot.toLocaleString('es-AR')} <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>TOKENS</span>
        </div>
      </div>

      {/* CABINET CONTAINER */}
      <div style={{
        background: 'rgba(20, 16, 36, 0.82)',
        border: '1px solid rgba(255, 215, 0, 0.15)',
        borderRadius: 24,
        padding: 16,
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        position: 'relative'
      }}>
        
        {/* Error panel */}
        {err && (
          <div style={{
            background: 'rgba(255, 59, 48, 0.12)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            borderRadius: 8, padding: '8px 12px',
            color: '#ff3b30', fontSize: '0.88rem',
            textAlign: 'center', marginBottom: 12,
            fontWeight: 600
          }}>
            ⚠️ {err}
          </div>
        )}

        {/* REELS VIEWPORT FRAME */}
        <div style={{
          border: '6px solid #141124',
          borderRadius: 14,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.95), 0 0 15px rgba(255, 215, 0, 0.08)',
          background: '#0a0a14',
          marginBottom: 16,
          // Evitar scrolls táctiles accidentales
          touchAction: 'none'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: 270,
            }}
          />

          {/* Sombra de profundidad en los bordes del slot */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 15px 25px rgba(0,0,0,0.9), inset 0 -15px 25px rgba(0,0,0,0.9)',
          }} />

          {/* BIG WIN OVERLAYS */}
          {showBigWin && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)', pointerEvents: 'none',
              animation: 'fadeIn 0.3s forwards'
            }}>
              <div style={{
                fontSize: '3.2rem', fontWeight: 900, color: '#ffd700',
                textShadow: '0 0 20px #ffd700, 0 0 40px #ff9500',
                letterSpacing: '0.1em', animation: 'scaleUpPulse 0.5s infinite alternate ease-in-out'
              }}>
                ¡BIG WIN!
              </div>
              <div style={{ fontSize: '1.4rem', color: '#00e850', fontWeight: 700, marginTop: 4 }}>
                +{lastWin.toLocaleString('es-AR')} TOKENS
              </div>
            </div>
          )}

          {/* MEGA JACKPOT OVERLAY */}
          {showJackpotWon && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(26, 0, 51, 0.85)', pointerEvents: 'none',
              animation: 'fadeIn 0.3s forwards',
              border: '4px solid #ffd700', borderRadius: 8
            }}>
              <div style={{
                fontSize: '1.2rem', color: '#ff3b30', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase'
              }}>
                🚨 ¡DIOS MÍO! 🚨
              </div>
              <div style={{
                fontSize: '3.4rem', fontWeight: 900, color: '#ffd700',
                textShadow: '0 0 20px #ffd700, 0 0 40px #ff3b30, 0 0 60px #ff00ff',
                letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.1,
                animation: 'scaleUpPulse 0.4s infinite alternate ease-in-out'
              }}>
                MEGA JACKPOT
              </div>
              <div style={{ fontSize: '1.8rem', color: '#00e850', fontWeight: 900, marginTop: 8, textShadow: '0 0 10px rgba(0,232,80,0.5)' }}>
                +{lastWin.toLocaleString('es-AR')} TOKENS
              </div>
            </div>
          )}
        </div>

        {/* INFO DISPLAY BAR */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: '10px 14px',
          border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 18,
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Apuesta</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffd700' }}>{bet}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ganancia</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: lastWin > 0 ? '#00e850' : '#888' }}>
              {lastWin > 0 ? `+${lastWin}` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Saldo</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#00d4ff' }}>{balance.toLocaleString('es-AR')}</div>
          </div>
        </div>

        {/* BET CONTROLS PANEL */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: '#8e8eaf', letterSpacing: '0.05em' }}>AJUSTAR APUESTA (9 Líneas de Pago Activas):</span>
            <button
              onClick={handleMaxBet}
              disabled={spinning}
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                color: '#ffd700', borderRadius: 6,
                padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Rajdhani', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(!spinning) e.target.style.background = 'rgba(255, 215, 0, 0.2)'; }}
              onMouseLeave={e => { if(!spinning) e.target.style.background = 'rgba(255, 215, 0, 0.1)'; }}
            >
              MÁX APUESTA
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => adjustBet(-9)}
              disabled={spinning || bet <= 9}
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: '#1a1829', border: '1px solid rgba(255,255,255,0.08)',
                color: 'white', fontSize: '1.2rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(!spinning && bet > 9) e.target.style.background = '#2a263f'; }}
              onMouseLeave={e => { if(!spinning) e.target.style.background = '#1a1829'; }}
            >
              -
            </button>
            <div style={{
              flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#09080e', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '1.05rem', fontWeight: 700, color: 'white'
            }}>
              {bet} tokens <span style={{ fontSize: '0.72rem', color: '#6a6a8a', marginLeft: 4 }}>({(bet/9).toFixed(1)}/lín)</span>
            </div>
            <button
              onClick={() => adjustBet(9)}
              disabled={spinning}
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: '#1a1829', border: '1px solid rgba(255,255,255,0.08)',
                color: 'white', fontSize: '1.2rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(!spinning) e.target.style.background = '#2a263f'; }}
              onMouseLeave={e => { if(!spinning) e.target.style.background = '#1a1829'; }}
            >
              +
            </button>
          </div>

          {/* Quick bets list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 8 }}>
            {QUICK_BETS.map(val => (
              <button
                key={val}
                disabled={spinning}
                onClick={() => setBetDirect(val)}
                style={{
                  padding: '6px 2px', borderRadius: 6,
                  background: bet === val ? 'rgba(255,215,0,0.15)' : '#12101e',
                  border: bet === val ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.05)',
                  color: bet === val ? '#ffd700' : '#8e8eaf',
                  fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Rajdhani', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if(!spinning && bet !== val) e.target.style.background = '#1a172c'; }}
                onMouseLeave={e => { if(!spinning && bet !== val) e.target.style.background = '#12101e'; }}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM TRIGGER BUTTON & MUTE */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={toggleMuted}
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#12101e', border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title={muted ? 'Activar sonido' : 'Mutear'}
            onMouseEnter={e => e.target.style.background = '#1a172c'}
            onMouseLeave={e => e.target.style.background = '#12101e'}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={startSpin}
            disabled={spinning}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: spinning
                ? 'linear-gradient(135deg, #4a1525, #22030a)'
                : 'linear-gradient(135deg, #ffd700, #ff8c00)',
              color: spinning ? '#ff6075' : '#050208',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              cursor: spinning ? 'not-allowed' : 'pointer',
              boxShadow: spinning
                ? 'none'
                : '0 0 15px rgba(255, 140, 0, 0.35), 0 4px 10px rgba(0,0,0,0.4)',
              transition: 'all 0.25s',
              fontFamily: 'Rajdhani',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              if (!spinning) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 0 22px rgba(255, 140, 0, 0.55), 0 5px 12px rgba(0,0,0,0.45)';
              }
            }}
            onMouseLeave={e => {
              if (!spinning) {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = '0 0 15px rgba(255, 140, 0, 0.35), 0 4px 10px rgba(0,0,0,0.4)';
              }
            }}
          >
            {spinning ? 'GIRANDO...' : '¡GIRAR! 🎰'}
          </button>
        </div>

      </div>

      {/* MINI PAYTABLE INFO FOOTER */}
      <div style={{
        marginTop: 18, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 14, padding: '12px 14px', fontSize: '0.78rem', color: '#6a6a8a', lineHeight: 1.4
      }}>
        <div style={{ fontWeight: 700, color: '#8e8eaf', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
          Tabla de Premios (Multiplicador de línea):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          <div>🔥 Seven: 3x (x25), 4x (x100), <strong>5x (¡JACKPOT GLOBAL!)</strong></div>
          <div>🃏 Wild: Sustituye y paga 3x (x50), 4x (x200), 5x (x1000)</div>
          <div>💎 Diamante: 3x (x15), 4x (x50), 5x (x200)</div>
          <div>🔔 Campana: 3x (x10), 4x (x30), 5x (x100)</div>
          <div>🍇 Uva: 3x (x5), 4x (x15), 5x (x50)</div>
          <div>🍊 Naranja: 3x (x4), 4x (x10), 5x (x30)</div>
          <div>🍋 Limón: 3x (x3), 4x (x8), 5x (x20)</div>
          <div>🍒 Cereza: 2x (x1), 3x (x2), 4x (x5), 5x (x15)</div>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.72rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 6, color: '#4d4d68' }}>
          * Los premios se pagan consecutivamente de izquierda a derecha. Un 2% de cada apuesta alimenta el pozo de Jackpot Global de la hermandad.
        </div>
      </div>

      {/* CSS Animation details embedded inline */}
      <style>{`
        @keyframes scaleUpPulse {
          0% { transform: scale(0.96); filter: brightness(0.95); }
          100% { transform: scale(1.04); filter: brightness(1.15); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
