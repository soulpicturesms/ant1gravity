import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const numberColor = n => {
  if (n === '0' || n === '00' || n === 0) return 'green';
  return RED_NUMS.has(parseInt(n)) ? '#ff4466' : '#3a3a5a';
};

// American sequence
const WHEEL_NUMBERS = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1',
  '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'
];

function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);
  
  // Physics engine variables in refs for 60 FPS performance
  const wheelAngleRef = useRef(0);
  const ballAngleRef = useRef(0);
  const ballRadiusRef = useRef(0);
  const ballSpeedRef = useRef(0);
  const ballStateRef = useRef('idle'); // 'idle' | 'outer_rim' | 'falling' | 'bouncing' | 'settled'
  
  const relAngleRef = useRef(0);
  const relAngleVelRef = useRef(0);
  const bounceIntensityRef = useRef(0);
  const bounceTimerRef = useRef(0);
  
  const ballRadiusVelRef = useRef(0);
  const lastSlotRef = useRef(-1);
  const animRef = useRef(null);
  const rollSoundRef = useRef(null); // Ref for continuous rolling sound loop
  
  const N = WHEEL_NUMBERS.length; // 38
  const wheelSpeed = 0.012; // slow constant rotation clockwise
  
  const resultRef = useRef(result);
  const onSpinCompleteRef = useRef(onSpinComplete);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  // Initial wheel geometry scale
  const canvasW = 380;
  const cx = canvasW / 2; // 190
  const cy = canvasW / 2; // 190
  const R = cx - 18;      // 172 (outer pockets boundary)

  const draw = (wheelRotDeg, ballAngleRad, ballRadiusPx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasW, canvasW);
    const arc = (2 * Math.PI) / N;
    const rotRad = (wheelRotDeg * Math.PI) / 180;

    // Draw background outer wheel wood
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#2f1f17';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw wheel sectors
    for (let i = 0; i < N; i++) {
      const n = WHEEL_NUMBERS[i];
      const start = rotRad + i * arc - Math.PI / 2;
      const end   = rotRad + (i + 1) * arc - Math.PI / 2;
      const mid   = rotRad + (i + 0.5) * arc - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = n === '0' || n === '00' ? '#1a5c1a' : RED_NUMS.has(parseInt(n)) ? '#8b1a2a' : '#1a1a2a';
      ctx.fill();

      // Divider lines
      ctx.beginPath();
      ctx.moveTo(cx + (R - 20) * Math.cos(start), cy + (R - 20) * Math.sin(start));
      ctx.lineTo(cx + R * Math.cos(start), cy + R * Math.sin(start));
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Numbers
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillStyle = '#e0e0f0';
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(n, R - 5, 0);
      ctx.restore();
    }

    // Outer gold border of pockets
    ctx.beginPath(); 
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffd700'; 
    ctx.lineWidth = 2.5; 
    ctx.stroke();

    // Inner gold border of pockets
    ctx.beginPath(); 
    ctx.arc(cx, cy, R - 20, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffd700'; 
    ctx.lineWidth = 2; 
    ctx.stroke();

    // Outer rim metal track for ball
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Brass Spindle
    ctx.beginPath(); 
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#ffd700');
    g.addColorStop(1, '#8b6508');
    ctx.fillStyle = g; 
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Spinner handles (4 brass arms rotating with wheel)
    for (let j = 0; j < 4; j++) {
      const handleAngle = rotRad + j * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 34 * Math.cos(handleAngle), cy + 34 * Math.sin(handleAngle));
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + 34 * Math.cos(handleAngle), cy + 34 * Math.sin(handleAngle), 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }

    // Draw Ball (Glowing spheres)
    if (ballAngleRad !== null && ballRadiusPx !== null) {
      const bx = cx + ballRadiusPx * Math.cos(ballAngleRad);
      const by = cy + ballRadiusPx * Math.sin(ballAngleRad);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, 2 * Math.PI);
      const ballGlow = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 8);
      ballGlow.addColorStop(0, '#ffffff');
      ballGlow.addColorStop(0.7, '#e4e4e4');
      ballGlow.addColorStop(1, '#9c9c9c');
      ctx.fillStyle = ballGlow;
      ctx.shadowColor = 'rgba(255,255,255,0.85)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
  };

  // State trigger for starting the physical spin animation
  useEffect(() => {
    if (spinning) {
      if (result === null) {
        // Start infinite spin rolling on the outer track
        ballStateRef.current = 'outer_rim';
        ballSpeedRef.current = -0.26; // opposite direction (counter-clockwise)
        ballRadiusRef.current = R + 4; // outer rim track
        
        // Start roll sound
        if (rollSoundRef.current) {
          rollSoundRef.current.stop();
        }
        rollSoundRef.current = casinoAudio.playRouletteRoll();
      }
    }
  }, [spinning, result]);

  // Main loop for wheel rotation and ball physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High-DPI setup for wheel
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasW * dpr;
    const ctx = canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const tick = () => {
      // 1. Rotate the wheel clockwise
      wheelAngleRef.current += wheelSpeed;
      const rotDeg = (wheelAngleRef.current * 180) / Math.PI;

      // 2. Physics-based Ball Simulation
      if (ballStateRef.current === 'outer_rim') {
        if (resultRef.current !== null) {
          // Response received! Slow down ball until it falls
          ballSpeedRef.current *= 0.993; // slow down more gradually (takes ~2.5s)
          if (Math.abs(ballSpeedRef.current) < 0.085) {
            ballStateRef.current = 'falling';
            ballRadiusVelRef.current = -0.05; // starts slow inward spiraling
          }
        }
        ballAngleRef.current += ballSpeedRef.current;
        ballRadiusRef.current = R + 4; // keep on outer track

        // Update rolling sound speed
        if (rollSoundRef.current) {
          const speedPercent = Math.min(Math.abs(ballSpeedRef.current) / 0.26, 1.0);
          rollSoundRef.current.setSpeed(speedPercent);
        }
      } 
      else if (ballStateRef.current === 'falling') {
        ballSpeedRef.current *= 0.992;
        ballAngleRef.current += ballSpeedRef.current;
        ballRadiusRef.current += ballRadiusVelRef.current;
        ballRadiusVelRef.current -= 0.004; // accelerate inward

        // Update rolling sound speed
        if (rollSoundRef.current) {
          const speedPercent = Math.min(Math.abs(ballSpeedRef.current) / 0.26, 1.0);
          rollSoundRef.current.setSpeed(speedPercent);
        }
        
        // Check if ball hits the pocket ring (R - 14)
        if (ballRadiusRef.current <= R - 14) {
          ballRadiusRef.current = R - 14;
          ballStateRef.current = 'bouncing';
          bounceTimerRef.current = 0;
          relAngleRef.current = ballAngleRef.current - wheelAngleRef.current;
          relAngleVelRef.current = ballSpeedRef.current - wheelSpeed;
          bounceIntensityRef.current = 1.0;

          // Stop rolling sound when hitting pockets
          if (rollSoundRef.current) {
            rollSoundRef.current.stop();
            rollSoundRef.current = null;
          }
        }
      }
      else if (ballStateRef.current === 'bouncing') {
        bounceTimerRef.current++;
        const targetIdx = WHEEL_NUMBERS.indexOf(String(resultRef.current));
        const targetRelAngle = (targetIdx + 0.5) * (2 * Math.PI / 38) - Math.PI / 2;
        const pocketArc = (2 * Math.PI) / 38;
        
        // --- Realistic angular physics ---
        // Gentle spring pull towards target pocket (very weak at first, strengthens over time)
        let diff = targetRelAngle - relAngleRef.current;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const springStrength = Math.min(0.003 + bounceTimerRef.current * 0.0003, 0.04);
        relAngleVelRef.current += diff * springStrength;
        
        // Natural fret collision bounces - when ball crosses a pocket divider
        const relativeAngle = relAngleRef.current;
        const currentPocketFloat = (((relativeAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / pocketArc;
        const currentPocket = Math.floor(currentPocketFloat);
        const posInPocket = currentPocketFloat - currentPocket;
        
        // Detect fret crossing (near pocket boundaries) and bounce off
        if (bounceIntensityRef.current > 0.02) {
          if (posInPocket < 0.08 || posInPocket > 0.92) {
            // Hit a fret! Reverse some angular velocity + add randomness
            if (Math.abs(relAngleVelRef.current) > 0.003) {
              relAngleVelRef.current *= -(0.3 + Math.random() * 0.3) * bounceIntensityRef.current;
              // Random kick simulating uneven frets
              relAngleVelRef.current += (Math.random() - 0.5) * 0.04 * bounceIntensityRef.current;
              
              // Trigger tick sound on fret hit
              if (currentPocket !== lastSlotRef.current) {
                lastSlotRef.current = currentPocket;
                casinoAudio.playRouletteTick();
              }
            }
          }
        }
        
        // Friction (angular)
        relAngleVelRef.current *= 0.985 - (0.005 * (1 - bounceIntensityRef.current));
        relAngleRef.current += relAngleVelRef.current;
        ballAngleRef.current = wheelAngleRef.current + relAngleRef.current;
        
        // --- Realistic radial bounce physics (gravity-like) ---
        const pocketBottom = R - 16;  // deepest point in pocket
        const pocketRim = R - 4;       // top rim of pockets
        
        // Gravity pulls ball toward pocket bottom
        const radialGravity = -0.08 * bounceIntensityRef.current;
        ballRadiusVelRef.current += radialGravity;
        
        // Apply velocity
        ballRadiusRef.current += ballRadiusVelRef.current;
        
        // Bounce off pocket bottom
        if (ballRadiusRef.current <= pocketBottom) {
          ballRadiusRef.current = pocketBottom;
          ballRadiusVelRef.current = Math.abs(ballRadiusVelRef.current) * (0.45 + Math.random() * 0.2) * bounceIntensityRef.current;
        }
        
        // Constrain to pocket rim
        if (ballRadiusRef.current > pocketRim) {
          ballRadiusRef.current = pocketRim;
          ballRadiusVelRef.current *= -0.5;
        }
        
        // Energy dissipation - bounce intensity decays naturally
        bounceIntensityRef.current *= 0.993;
        ballRadiusVelRef.current *= 0.96;
        
        // Transition to settling when energy is very low
        if (bounceIntensityRef.current <= 0.025 && 
            Math.abs(relAngleVelRef.current) < 0.004 && 
            Math.abs(ballRadiusVelRef.current) < 0.15) {
          ballStateRef.current = 'settling';
          bounceTimerRef.current = 0;
          casinoAudio.playRouletteSettle();
        }
      }
      else if (ballStateRef.current === 'settling') {
        // Smooth exponential ease-out to final pocket center
        bounceTimerRef.current++;
        const targetIdx = WHEEL_NUMBERS.indexOf(String(resultRef.current));
        const targetRelAngle = (targetIdx + 0.5) * (2 * Math.PI / 38) - Math.PI / 2;
        
        let diff = targetRelAngle - relAngleRef.current;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        
        // Gradual ease - closes 6% of remaining gap per frame
        relAngleRef.current += diff * 0.06;
        
        // Ease radius to pocket bottom
        const pocketBottom = R - 14;
        ballRadiusRef.current += (pocketBottom - ballRadiusRef.current) * 0.1;
        
        ballAngleRef.current = wheelAngleRef.current + relAngleRef.current;
        
        // Complete settling after enough time and close enough
        if (bounceTimerRef.current > 40 && Math.abs(diff) < 0.002) {
          relAngleRef.current = targetRelAngle;
          ballAngleRef.current = wheelAngleRef.current + relAngleRef.current;
          ballRadiusRef.current = pocketBottom;
          ballStateRef.current = 'settled';

          if (onSpinCompleteRef.current) {
            onSpinCompleteRef.current();
          }
        }
      }
      else if (ballStateRef.current === 'settled') {
        ballAngleRef.current = wheelAngleRef.current + relAngleRef.current;
        ballRadiusRef.current = R - 14;
      }
      else {
        // Idle before spin, keep ball in last winning pocket
        if (resultRef.current !== null && resultRef.current !== undefined) {
          const targetIdx = WHEEL_NUMBERS.indexOf(String(resultRef.current));
          if (targetIdx !== -1) {
            const targetRelAngle = (targetIdx + 0.5) * (2 * Math.PI / 38) - Math.PI / 2;
            ballAngleRef.current = wheelAngleRef.current + targetRelAngle;
            ballRadiusRef.current = R - 14;
          }
        } else {
          ballAngleRef.current = null;
          ballRadiusRef.current = null;
        }
      }

      // Draw everything
      draw(rotDeg, ballAngleRef.current, ballRadiusRef.current);

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (rollSoundRef.current) {
        rollSoundRef.current.stop();
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', maxWidth: 380, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 2, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #ffd700', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.85))' }} />
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: '50%', display: 'block' }} />
    </div>
  );
}

function BetChip({ value, active, onClick }) {
  const colors = { 10:'#6a6a8a', 50:'#00aa66', 100:'#00d4ff', 500:'#a78bfa', 1000:'#ffd700' };
  return (
    <div onClick={onClick} style={{ width: 46, height: 46, borderRadius: '50%', background: colors[value] || '#6a6a8a', border: `3.5px dashed ${active ? 'white' : 'rgba(255,255,255,0.25)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 900, fontSize: '0.8rem', color: 'white', boxShadow: active ? '0 0 14px rgba(255,255,255,0.65)' : 'none', transition: 'all 0.15s', userSelect: 'none' }}>
      {value >= 1000 ? `${value/1000}K` : value}
    </div>
  );
}

function BettingGrid({ bets, onBet }) {
  const canvasGridRef = useRef(null);
  const [hoverBet, setHoverBet] = useState(null);

  // Layout geometry calculations (expanded cell dimensions)
  function getBetCoordinates(type, value) {
    if (type === 'number') {
      if (value === '0') return { x: 27, y: 24 };
      if (value === '00') return { x: 27, y: 96 };
      const n = parseInt(value);
      const col = Math.floor((n - 1) / 3);
      const row = 2 - ((n - 1) % 3);
      return { x: 54 + col * 48 + 24, y: row * 48 + 24 };
    }
    if (type === 'split') {
      if (value === '0,00') return { x: 27, y: 72 };
      if (value === '0,3') return { x: 54, y: 24 };
      if (value === '0,2') return { x: 54, y: 48 };
      if (value === '00,2') return { x: 54, y: 96 };
      if (value === '00,1') return { x: 54, y: 120 };

      const [n1, n2] = value.split(',').map(Number);
      const col1 = Math.floor((n1 - 1) / 3);
      const row1 = 2 - ((n1 - 1) % 3);
      const col2 = Math.floor((n2 - 1) / 3);
      const row2 = 2 - ((n2 - 1) % 3);

      if (col1 === col2) {
        return { x: 54 + col1 * 48 + 24, y: Math.max(row1, row2) * 48 };
      } else {
        return { x: 54 + Math.max(col1, col2) * 48, y: row1 * 48 + 24 };
      }
    }
    if (type === 'corner') {
      const nums = value.split(',').map(Number);
      const cols = nums.map(n => Math.floor((n - 1) / 3));
      const rows = nums.map(n => 2 - ((n - 1) % 3));
      const midX = 54 + Math.max(...cols) * 48;
      const midY = Math.max(...rows) * 48;
      return { x: midX, y: midY };
    }
    if (type === 'column') {
      const row = 3 - parseInt(value);
      return { x: 630 + 27, y: row * 48 + 24 };
    }
    return null;
  }

  // Draw 3D glossy layered poker chip
  function drawChip(ctx, x, y, amount) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const stackHeight = amount >= 1000 ? 3 : amount >= 100 ? 2 : 1;
    let color = '#6a6a8a';
    if (amount >= 1000) color = '#ffd700';
    else if (amount >= 500) color = '#a78bfa';
    else if (amount >= 100) color = '#00d4ff';
    else if (amount >= 50) color = '#00aa66';

    for (let i = 0; i < stackHeight; i++) {
      const cy = y - i * 3;
      
      ctx.beginPath();
      ctx.arc(x, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Chip edge textures
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, cy, 11, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, cy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
    }

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 8px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount;
    ctx.fillText(label, x, y - (stackHeight - 1) * 3);
    ctx.restore();
  }

  // Map mouse hover to split or corner coordinates
  const handleMouseMove = (e) => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 684 / rect.width;
    const scaleY = 144 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hoverType = null;
    let hoverValue = null;
    let hoverNums = [];

    if (mx < 54) {
      if (Math.abs(my - 72) < 8) {
        hoverType = 'split';
        hoverValue = '0,00';
        hoverNums = ['0', '00'];
      } else if (my < 72) {
        hoverType = 'number';
        hoverValue = '0';
        hoverNums = ['0'];
      } else {
        hoverType = 'number';
        hoverValue = '00';
        hoverNums = ['00'];
      }
    } else if (mx >= 54 && mx < 630) {
      const gridX = mx - 54;
      const gridY = my;
      const col = Math.floor(gridX / 48);
      const row = Math.floor(gridY / 48);

      const dx = gridX % 48;
      const dy = gridY % 48;

      const nearLeft = dx < 8;
      const nearRight = dx > 40;
      const nearTop = dy < 8;
      const nearBottom = dy > 40;

      const intersectCol = nearLeft ? col : nearRight ? col + 1 : -1;
      const intersectRow = nearTop ? row : nearBottom ? row + 1 : -1;

      // Corner (4 numbers)
      if (intersectCol > 0 && intersectCol <= 11 && intersectRow > 0 && intersectRow <= 2) {
        const numTopLeft = (intersectCol - 1) * 3 + (3 - (intersectRow - 1));
        const numTopRight = intersectCol * 3 + (3 - (intersectRow - 1));
        const numBotLeft = (intersectCol - 1) * 3 + (3 - intersectRow);
        const numBotRight = intersectCol * 3 + (3 - intersectRow);
        
        hoverType = 'corner';
        const nums = [numTopLeft, numTopRight, numBotLeft, numBotRight].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } 
      // Horizontal Split (2 numbers vertically)
      else if (nearTop && row > 0) {
        const n1 = col * 3 + (3 - (row - 1));
        const n2 = col * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } else if (nearBottom && row < 2) {
        const n1 = col * 3 + (3 - row);
        const n2 = col * 3 + (3 - (row + 1));
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      }
      // Vertical Split (2 numbers horizontally)
      else if (nearLeft && col > 0) {
        const n1 = (col - 1) * 3 + (3 - row);
        const n2 = col * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      } else if (nearRight && col < 11) {
        const n1 = col * 3 + (3 - row);
        const n2 = (col + 1) * 3 + (3 - row);
        hoverType = 'split';
        const nums = [n1, n2].map(String).sort((a,b) => parseInt(a)-parseInt(b));
        hoverValue = nums.join(',');
        hoverNums = nums;
      }
      // Straight bet
      else if (col >= 0 && col <= 11 && row >= 0 && row <= 2) {
        const n = col * 3 + (3 - row);
        hoverType = 'number';
        hoverValue = String(n);
        hoverNums = [String(n)];
      }
    } else if (mx >= 630 && mx <= 684) {
      const row = Math.floor(my / 48);
      if (row >= 0 && row <= 2) {
        hoverType = 'column';
        hoverValue = String(3 - row);
        hoverNums = [];
      }
    }

    setHoverBet({ type: hoverType, value: hoverValue, nums: hoverNums });
  };

  const handleMouseLeave = () => {
    setHoverBet(null);
  };

  const handleCanvasClick = () => {
    if (hoverBet && hoverBet.type && hoverBet.value) {
      onBet(hoverBet.type, hoverBet.value);
    }
  };

  // Draw Betting Grid Canvas
  useEffect(() => {
    const canvas = canvasGridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const logicalW = 684;
    const logicalH = 144;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, logicalW, logicalH);

    const isHovered = (val) => hoverBet && hoverBet.nums.includes(val);

    // Draw 0
    ctx.fillStyle = isHovered('0') ? 'rgba(0, 212, 255, 0.35)' : '#1a5c1a';
    ctx.fillRect(0, 0, 54, 72);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 54, 72);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 27, 36);

    // Draw 00
    ctx.fillStyle = isHovered('00') ? 'rgba(0, 212, 255, 0.35)' : '#1a5c1a';
    ctx.fillRect(0, 72, 54, 72);
    ctx.strokeRect(0, 72, 54, 72);
    ctx.fillStyle = 'white';
    ctx.fillText('00', 27, 108);

    // Draw Numbers (1-36)
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const n = c * 3 + (3 - r);
        const isNumHovered = isHovered(String(n));
        const cellColor = RED_NUMS.has(n) ? '#8b1a2a' : '#1e1e2f';

        ctx.fillStyle = isNumHovered ? 'rgba(255, 215, 0, 0.3)' : cellColor;
        ctx.fillRect(54 + c * 48, r * 48, 48, 48);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.strokeRect(54 + c * 48, r * 48, 48, 48);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Rajdhani';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n), 54 + c * 48 + 24, r * 48 + 24);
      }
    }

    // Draw Column Bets (2to1)
    for (let r = 0; r < 3; r++) {
      const colVal = String(3 - r);
      const isColHovered = hoverBet && hoverBet.type === 'column' && hoverBet.value === colVal;
      ctx.fillStyle = isColHovered ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(630, r * 48, 54, 48);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.strokeRect(630, r * 48, 54, 48);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px Rajdhani';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2to1', 630 + 27, r * 48 + 24);
    }

    // Draw highlighted split/corner borders
    if (hoverBet && (hoverBet.type === 'split' || hoverBet.type === 'corner')) {
      const coords = getBetCoordinates(hoverBet.type, hoverBet.value);
      if (coords) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.85)';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw all chip piles
    bets.forEach(b => {
      const coords = getBetCoordinates(b.type, b.value);
      if (coords) {
        drawChip(ctx, coords.x, coords.y, b.amount);
      }
    });

  }, [bets, hoverBet]);

  // HTML outside bet cells
  const Cell = ({ label, type, value }) => {
    const myBet = bets.filter(b => b.type === type && b.value === value).reduce((s, b) => s + b.amount, 0);
    let chipColor = '#6a6a8a';
    if (myBet >= 1000) chipColor = '#ffd700';
    else if (myBet >= 500) chipColor = '#a78bfa';
    else if (myBet >= 100) chipColor = '#00d4ff';
    else if (myBet >= 50) chipColor = '#00aa66';

    const textLabel = myBet >= 1000 ? `${(myBet/1000).toFixed(0)}K` : myBet;

    return (
      <div onClick={() => onBet(type, value)} style={{
        minHeight: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,215,0,0.25)', borderRadius: 4, cursor: 'pointer', userSelect: 'none',
        background: myBet > 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.03)',
        transition: 'background 0.1s', fontSize: '0.8rem', fontFamily: 'Rajdhani', fontWeight: 700, color: '#e0e0f0', position: 'relative',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = myBet > 0 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.03)'}>
        {label}
        {myBet > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 28, height: 28, borderRadius: '50%', background: chipColor,
            border: '2px dashed white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.62rem', fontWeight: 900, color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.4)', pointerEvents: 'none'
          }}>
            {textLabel}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
      {/* Canvas container for numbers, 0, 00, splits, and corners */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 684, aspectRatio: '684/144', marginBottom: 6 }}>
        <canvas
          ref={canvasGridRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block', borderRadius: 4, border: '1px solid rgba(255,215,0,0.3)' }}
        />
      </div>

      {/* Dozens Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(3, 28.07%) 7.89%', gap: 3, width: '100%', maxWidth: 684, marginBottom: 3 }}>
        <div style={{ visibility: 'hidden' }} />
        <Cell label="1st 12" type="dozen" value="1-12" />
        <Cell label="2nd 12" type="dozen" value="13-24" />
        <Cell label="3rd 12" type="dozen" value="25-36" />
        <div style={{ visibility: 'hidden' }} />
      </div>

      {/* Low/High, Red/Black, Even/Odd Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.89% repeat(6, 14.03%) 7.89%', gap: 3, width: '100%', maxWidth: 684 }}>
        <div style={{ visibility: 'hidden' }} />
        <Cell label="1-18" type="half" value="low" />
        <Cell label="Even" type="parity" value="even" />
        <Cell label="Red" type="color" value="red" />
        <Cell label="Black" type="color" value="black" />
        <Cell label="Odd" type="parity" value="odd" />
        <Cell label="19-36" type="half" value="high" />
        <div style={{ visibility: 'hidden' }} />
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
  const [pendingSummary, setPendingSummary] = useState(null);
  const [muted, setMuted] = useState(casinoAudio.muted);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = (type, value) => {
    casinoAudio.playChip();
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
    setErr(''); setSpinning(true); setResult(null); setSummary(null); setPendingSummary(null);
    try {
      const res = await api.casinoRuleta({ bets });
      onBalanceChange(res.balance);
      setResult(res.number);
      setPendingSummary(res);
    } catch (e) { setErr(e.message); setSpinning(false); }
  };

  const handleSpinComplete = () => {
    if (pendingSummary) {
      setSummary(pendingSummary);
      setSpinning(false);
      setBets([]);
      
      if (pendingSummary.net >= 0) {
        casinoAudio.playWin();
      } else {
        casinoAudio.playLose();
      }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1300, margin: '0 auto', padding: '0 10px' }}>
      <div className="card" style={{ border: '1px solid rgba(255,215,0,0.2)', background: 'linear-gradient(135deg, #0d0d1e, #06060c)', padding: 24, boxShadow: '0 15px 40px rgba(0,0,0,0.7)' }}>
        
        {/* Header & Mute toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 32 }} />
          <div style={{ textAlign: 'center', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.8rem', color: '#ffd700', letterSpacing: '0.12em', margin: 0, textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>
            🎰 RULETA CASINO (AMERICAN ROULETTE 00) <span style={{ fontSize: '0.75rem', color: '#6a6a8a', verticalAlign: 'middle', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>v2.3.0</span>
          </div>
          <button onClick={() => {
            const nowMuted = casinoAudio.toggleMute();
            setMuted(nowMuted);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'rgba(255,255,255,0.45)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={muted ? 'Activar Sonido' : 'Silenciar'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 16 }}>{err}</div>}

        {/* 2-Column Side-by-Side Responsive Layout */}
        <div className="roulette-layout">
          
          {/* Left Column: Large Wheel + Chips + Spin Controls */}
          <div className="roulette-wheel-col">
            <RouletteWheel spinning={spinning} result={result} onSpinComplete={handleSpinComplete} />
            
            {/* Chip selector */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 22, marginBottom: 16 }}>
              {[10,50,100,500,1000].map(v => <BetChip key={v} value={v} active={chip===v} onClick={() => setChip(v)} />)}
            </div>

            {/* Totals & Actions */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.45)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.85rem', color: '#6a6a8a', letterSpacing: '0.05em' }}>Apuesta total:</span>
                <strong style={{ color: '#ffd700', fontSize: '1.25rem', fontFamily: 'Rajdhani', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}>{totalBet.toLocaleString('es-AR')} tokens</strong>
              </div>
              
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {bets.length > 0 && (
                  <button onClick={() => setBets([])} style={{ flex: '1', padding: '10px 12px', background: 'rgba(255, 68, 102, 0.08)', border: '1px solid rgba(255, 68, 102, 0.25)', color: '#ff4466', borderRadius: 8, cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s' }}>
                    ✕ Limpiar
                  </button>
                )}
                <button className="btn btn-primary" onClick={spin} disabled={spinning || !bets.length} style={{ flex: '2', padding: '10px 16px', fontFamily: 'Rajdhani', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, letterSpacing: '0.1em' }}>
                  {spinning ? '⏳ Girando...' : '🎰 Girar'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Wide Betting Grid + Result Summary */}
          <div className="roulette-grid-col">
            
            {/* Win/Loss Summary Display */}
            {summary && (
              <div style={{ width: '100%', textAlign: 'center', marginBottom: 16, padding: '12px 18px', background: summary.net >= 0 ? 'rgba(0,204,102,0.1)' : 'rgba(255,68,102,0.1)', border: `1px solid ${summary.net >= 0 ? '#00cc6633' : '#ff446633'}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <div style={{ background: numberColor(summary.number), width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 900, color: 'white', fontSize: '1.2rem', boxShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
                    {summary.number}
                  </div>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 900, fontSize: '1.4rem', color: summary.net >= 0 ? '#00cc66' : '#ff4466', letterSpacing: '0.05em' }}>
                    {summary.net >= 0 ? `¡Ganaste +${summary.net.toLocaleString('es-AR')}!` : `Perdiste ${summary.net.toLocaleString('es-AR')} tokens`}
                  </div>
                </div>
              </div>
            )}

            <BettingGrid bets={bets} onBet={addBet} />
            
            {/* Split / Corner Instruction Help Banner */}
            <div style={{ width: '100%', marginTop: 14, background: 'rgba(255, 215, 0, 0.04)', border: '1px dashed rgba(255, 215, 0, 0.25)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: '#8e8eaf', textAlign: 'center', lineHeight: 1.4 }}>
              💡 <strong>Soporte para Apuestas Múltiples:</strong> Pasa el mouse por el borde de 2 números (Apuesta Split - paga 18x) o por la intersección de 4 números (Apuesta Corner - paga 9x). Los números correspondientes se resaltarán. ¡Haz clic para apostar!
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
