import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ── Layout constants ───────────────────────────────────────────────────────────
const BALL_R   = 12;
const FRICTION = 0.9875;
const CW = 940, CH = 490;
const TX = 32,  TY = 26;
const TW = 860, TH = 430;
const CU = 22;
const FX = TX+CU, FY = TY+CU;
const FW = TW-2*CU, FH = TH-2*CU;   // 816 × 386
const PD = 17;

const POCKETS = [
  {x:0,   y:0  },{x:FW/2, y:-6 },{x:FW,  y:0  },
  {x:0,   y:FH },{x:FW/2, y:FH+6},{x:FW, y:FH },
];

// Ball base colours
const BCLR = [
  '#f5f0e8',          // 0  cue
  '#d4a800','#1455a4','#c0251b','#6b2f9e',
  '#d46000','#197a3a','#7a2e0e','#111111', // 1-8
  '#d4a800','#1455a4','#c0251b','#6b2f9e',
  '#d46000','#197a3a','#7a2e0e',           // 9-15 (same hues, stripes)
];

// ── Rack ──────────────────────────────────────────────────────────────────────
function makeRack() {
  const rx = FW*0.70, ry = FH/2;
  const dRow = BALL_R*2*Math.cos(Math.PI/6), dCol = BALL_R*2;
  const balls = [{id:0,x:FW*0.25,y:ry,vx:0,vy:0,pocketed:false}];
  const slots = [];
  for (let row=0;row<5;row++)
    for (let col=0;col<=row;col++)
      slots.push({x:rx+row*dRow, y:ry-row*BALL_R+col*dCol});
  const others=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
  for (let i=others.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
  const ids=[...others.slice(0,4),8,...others.slice(4)];
  slots.forEach((s,i)=>balls.push({id:ids[i],x:s.x,y:s.y,vx:0,vy:0,pocketed:false}));
  return balls;
}

// ── Physics ───────────────────────────────────────────────────────────────────
function stepPhysics(balls, spinState) {
  const pocketed = [];
  // Move + friction
  for (const b of balls) {
    if (b.pocketed) continue;
    b.x+=b.vx; b.y+=b.vy;
    b.vx*=FRICTION; b.vy*=FRICTION;
    if (Math.abs(b.vx)<0.035) b.vx=0;
    if (Math.abs(b.vy)<0.035) b.vy=0;
    // Cushions
    if (b.x<BALL_R)    {b.x=BALL_R;    b.vx= Math.abs(b.vx)*0.70;}
    if (b.x>FW-BALL_R) {b.x=FW-BALL_R; b.vx=-Math.abs(b.vx)*0.70;}
    if (b.y<BALL_R)    {b.y=BALL_R;    b.vy= Math.abs(b.vy)*0.70;}
    if (b.y>FH-BALL_R) {b.y=FH-BALL_R; b.vy=-Math.abs(b.vy)*0.70;}
  }
  // Ball-ball collisions
  const active=balls.filter(b=>!b.pocketed);
  for (let i=0;i<active.length;i++){
    for (let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j];
      const dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy, minD=BALL_R*2;
      if (d2<minD*minD && d2>0.0001){
        const d=Math.sqrt(d2), nx=dx/d, ny=dy/d;
        const ovlp=(minD-d)/2;
        a.x-=nx*ovlp; a.y-=ny*ovlp;
        b.x+=nx*ovlp; b.y+=ny*ovlp;
        const rv=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        if (rv>0){
          a.vx-=rv*nx; a.vy-=rv*ny;
          b.vx+=rv*nx; b.vy+=rv*ny;
        }
        // Apply spin on first cue-ball collision
        if (!spinState.applied && (a.id===0||b.id===0) && (a.id===0)!==(b.id===0)) {
          const cb=a.id===0?a:b;
          const {hx,hy,sdx,sdy}=spinState;
          cb.vx+=sdx*(-hy)*5; cb.vy+=sdy*(-hy)*5;  // topspin
          cb.vx-=sdx*Math.max(0,hy)*8; cb.vy-=sdy*Math.max(0,hy)*8; // backspin
          cb.vx+=(-sdy)*hx*4; cb.vy+=sdx*hx*4;     // english
          spinState.applied=true;
        }
      }
    }
  }
  // Pockets
  for (const b of balls) {
    if (b.pocketed) continue;
    for (const p of POCKETS){
      const dx=b.x-p.x, dy=b.y-p.y;
      if (dx*dx+dy*dy<PD*PD){b.pocketed=true;b.vx=0;b.vy=0;pocketed.push(b.id);break;}
    }
  }
  return pocketed;
}

const allStopped = bs => bs.every(b=>b.pocketed||(b.vx===0&&b.vy===0));

// Aim ray
function aimRay(balls, cb, angle, max=1200) {
  const dx=Math.cos(angle), dy=Math.sin(angle);
  let best=max, hitBall=null;
  for (const b of balls){
    if (b.id===0||b.pocketed) continue;
    const tx=b.x-cb.x, ty=b.y-cb.y, proj=tx*dx+ty*dy;
    if (proj<0) continue;
    const perp2=tx*tx+ty*ty-proj*proj, mD2=(BALL_R*2)*(BALL_R*2);
    if (perp2<mD2){const hit=proj-Math.sqrt(mD2-perp2);if(hit>0&&hit<best){best=hit;hitBall=b;}}
  }
  return {ex:cb.x+dx*best, ey:cb.y+dy*best, hitBall};
}

// ── 3D Ball rendering ─────────────────────────────────────────────────────────
function draw3DBall(ctx, b, hitPos) {
  if (b.pocketed) return;
  const cx=FX+b.x, cy=FY+b.y, r=BALL_R;

  // ── Soft drop shadow (ellipse below ball)
  const sg=ctx.createRadialGradient(cx+r*0.1,cy+r*0.82,0,cx+r*0.1,cy+r*0.85,r*1.35);
  sg.addColorStop(0,'rgba(0,0,0,0.28)'); sg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sg;
  ctx.beginPath(); ctx.ellipse(cx,cy+r*0.88,r*1.18,r*0.32,0,0,Math.PI*2); ctx.fill();

  // ── Clip all ball layers
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();

  // ── Base fill
  if (b.id===0) {
    // Ivory cue ball
    const bg=ctx.createRadialGradient(cx-r*0.2,cy-r*0.2,0,cx,cy,r*1.1);
    bg.addColorStop(0,'#faf6ed'); bg.addColorStop(1,'#ccc4a8');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  } else if (b.id===8) {
    ctx.fillStyle='#0c0c0c'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    // White inner circle
    const ig=ctx.createRadialGradient(cx-r*0.08,cy-r*0.08,0,cx,cy,r*0.44);
    ig.addColorStop(0,'#ffffff'); ig.addColorStop(1,'#e0e0e0');
    ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(cx,cy,r*0.42,0,Math.PI*2); ctx.fill();
  } else if (b.id<=7) {
    // Solid — slight radial to give spherical base colour
    const bg=ctx.createRadialGradient(cx-r*0.25,cy-r*0.25,0,cx,cy,r*1.1);
    const c=BCLR[b.id];
    bg.addColorStop(0,lighten(c,0.28)); bg.addColorStop(0.6,c); bg.addColorStop(1,darken(c,0.4));
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  } else {
    // Stripe — ivory base
    const bg=ctx.createRadialGradient(cx-r*0.2,cy-r*0.2,0,cx,cy,r*1.1);
    bg.addColorStop(0,'#faf6ed'); bg.addColorStop(1,'#c9c0a6');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    // Colour band
    const c=BCLR[b.id];
    const bg2=ctx.createLinearGradient(cx-r,cy-r*0.48,cx+r,cy+r*0.48);
    bg2.addColorStop(0,lighten(c,0.25)); bg2.addColorStop(0.5,c); bg2.addColorStop(1,darken(c,0.3));
    ctx.fillStyle=bg2; ctx.fillRect(cx-r,cy-r*0.5,r*2,r);
    // White oval for number
    const og=ctx.createRadialGradient(cx,cy,0,cx,cy,r*0.42);
    og.addColorStop(0,'#ffffff'); og.addColorStop(1,'#f0ece0');
    ctx.fillStyle=og; ctx.beginPath(); ctx.ellipse(cx,cy,r*0.48,r*0.38,0,0,Math.PI*2); ctx.fill();
  }

  // ── Directional diffuse light (upper-left bright, lower-right dark)
  const diff=ctx.createLinearGradient(cx-r*0.8,cy-r*0.8,cx+r*0.8,cy+r*0.8);
  diff.addColorStop(0,'rgba(255,255,255,0.12)');
  diff.addColorStop(0.42,'rgba(255,255,255,0)');
  diff.addColorStop(1,'rgba(0,0,0,0.38)');
  ctx.fillStyle=diff; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  // ── Ambient occlusion edge
  const ao=ctx.createRadialGradient(cx,cy,r*0.55,cx,cy,r);
  ao.addColorStop(0,'rgba(0,0,0,0)'); ao.addColorStop(1,'rgba(0,0,0,0.22)');
  ctx.fillStyle=ao; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  // ── Large soft specular (environment map)
  const sp1=ctx.createRadialGradient(cx-r*0.3,cy-r*0.34,0,cx-r*0.05,cy-r*0.05,r*0.78);
  sp1.addColorStop(0,'rgba(255,255,255,0.82)');
  sp1.addColorStop(0.38,'rgba(255,255,255,0.28)');
  sp1.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sp1; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  // ── Sharp specular dot (the "hotspot")
  const sp2=ctx.createRadialGradient(cx-r*0.36,cy-r*0.40,0,cx-r*0.36,cy-r*0.40,r*0.20);
  sp2.addColorStop(0,'rgba(255,255,255,1)');
  sp2.addColorStop(0.55,'rgba(255,255,255,0.55)');
  sp2.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=sp2; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  // ── Faint back-rim light (slight glow on opposite side)
  const rim=ctx.createRadialGradient(cx+r*0.55,cy+r*0.55,r*0.5,cx+r*0.55,cy+r*0.55,r);
  rim.addColorStop(0,'rgba(80,120,255,0.07)'); rim.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

  ctx.restore(); // end clip

  // ── Number (drawn outside clip for crisp sub-pixel rendering)
  if (b.id>0) {
    const fs=`bold ${r*0.78}px Arial`;
    ctx.font=fs; ctx.textAlign='center'; ctx.textBaseline='middle';
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillText(String(b.id),cx+0.6,cy+1.1);
    // Colour
    let numColor;
    if (b.id===8) numColor='#111';          // on white circle
    else if (b.id<=7) numColor='#fff';      // on coloured solid
    else numColor=BCLR[b.id];               // on white oval of stripe
    ctx.fillStyle=numColor;
    ctx.fillText(String(b.id),cx,cy);
  }

  // ── Hit-position dot on cue ball (shows where we'll strike)
  if (b.id===0 && hitPos) {
    const hcx=cx+hitPos.x*(r*0.72), hcy=cy+hitPos.y*(r*0.72);
    ctx.beginPath(); ctx.arc(hcx,hcy,2.8,0,Math.PI*2);
    ctx.fillStyle='rgba(255,45,122,0.9)'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=0.8; ctx.stroke();
  }
}

// colour helpers
function lighten(hex, amt) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+amt*255|0)},${Math.min(255,g+amt*255|0)},${Math.min(255,b+amt*255|0)})`;
}
function darken(hex, amt) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-amt*255|0)},${Math.max(0,g-amt*255|0)},${Math.max(0,b-amt*255|0)})`;
}

// ── Table ─────────────────────────────────────────────────────────────────────
function drawTable(ctx) {
  // Wood frame
  const wg=ctx.createLinearGradient(TX,TY,TX,TY+TH);
  wg.addColorStop(0,'#7c5228'); wg.addColorStop(0.5,'#4c2e10'); wg.addColorStop(1,'#2c1808');
  ctx.fillStyle=wg; ctx.beginPath(); ctx.roundRect(TX,TY,TW,TH,18); ctx.fill();
  ctx.strokeStyle='#c9983d'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.roundRect(TX+3,TY+3,TW-6,TH-6,16); ctx.stroke();

  // Felt
  const fg=ctx.createRadialGradient(FX+FW/2,FY+FH/2,10,FX+FW/2,FY+FH/2,FW*0.72);
  fg.addColorStop(0,'#1d6040'); fg.addColorStop(1,'#0c2e1c');
  ctx.fillStyle=fg; ctx.fillRect(FX,FY,FW,FH);

  // Subtle fabric grain
  for (let x=FX;x<FX+FW;x+=7){
    ctx.fillStyle='rgba(0,0,0,0.025)'; ctx.fillRect(x,FY,1,FH);
  }

  // Head string
  ctx.setLineDash([5,5]); ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,0.07)';
  const hs=FX+FW*0.25;
  ctx.beginPath(); ctx.moveTo(hs,FY+4); ctx.lineTo(hs,FY+FH-4); ctx.stroke();
  ctx.setLineDash([]);

  // Watermark
  ctx.fillStyle='rgba(255,255,255,0.05)';
  ctx.font='bold 10px Unbounded,system-ui';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('ANT1GRAVITY BILLIARDS', FX+FW/2, FY+FH/2);

  // Pockets
  POCKETS.forEach(p=>{
    const cx=FX+p.x, cy=FY+p.y;
    // Shadow halo
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,PD+8);
    sg.addColorStop(0,'rgba(0,0,0,0.9)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,PD+8,0,Math.PI*2); ctx.fill();
    // Hole
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(cx,cy,PD-1,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#c9983d'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,cy,PD+1,0,Math.PI*2); ctx.stroke();
  });
}

// ── Cue stick ─────────────────────────────────────────────────────────────────
function drawCue(ctx, cb, angle, power) {
  const cx=FX+cb.x, cy=FY+cb.y;
  const pullback=power*30, tipD=BALL_R+pullback+5, len=195;
  const ax=-Math.cos(angle), ay=-Math.sin(angle);
  const sx=cx+ax*tipD, sy=cy+ay*tipD;
  const ex=cx+ax*(tipD+len), ey=cy+ay*(tipD+len);

  const g=ctx.createLinearGradient(sx,sy,ex,ey);
  g.addColorStop(0,'#1a1006'); g.addColorStop(0.08,'#5a3a14');
  g.addColorStop(0.4,'#b88820'); g.addColorStop(1,'#e8c055');
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
  ctx.lineWidth=7; ctx.lineCap='round'; ctx.strokeStyle=g; ctx.stroke();

  // Tip
  ctx.beginPath(); ctx.arc(sx,sy,3.5,0,Math.PI*2);
  const tg=ctx.createRadialGradient(sx-1,sy-1,0,sx,sy,3.5);
  tg.addColorStop(0,'#6aade0'); tg.addColorStop(1,'#2a6090');
  ctx.fillStyle=tg; ctx.fill();
}

// ── Aim guide ─────────────────────────────────────────────────────────────────
function drawAimLine(ctx, cb, balls, angle) {
  const {ex,ey,hitBall}=aimRay(balls,cb,angle);
  const sx=FX+cb.x, sy=FY+cb.y, tx=FX+ex, ty=FY+ey;

  ctx.setLineDash([6,5]); ctx.lineWidth=1.2;
  ctx.strokeStyle='rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.setLineDash([]);

  if (hitBall) {
    // Ghost ball at impact
    ctx.beginPath(); ctx.arc(tx,ty,BALL_R,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.32)'; ctx.lineWidth=1.5; ctx.stroke();
    // Deflection
    const nx=(hitBall.x-ex)/((BALL_R*2)||1), ny=(hitBall.y-ey)/((BALL_R*2)||1);
    const len=Math.sqrt(nx*nx+ny*ny)||1;
    ctx.setLineDash([4,4]);
    ctx.strokeStyle='rgba(255,210,60,0.28)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(FX+hitBall.x,FY+hitBall.y);
    ctx.lineTo(FX+hitBall.x+nx/len*60,FY+hitBall.y+ny/len*60); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ── Power bar ─────────────────────────────────────────────────────────────────
function drawPowerBar(ctx, power) {
  const bx=TX+TW+10, by=TY, bw=13, bh=TH;
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,6); ctx.fill();
  if (power>0) {
    const fh=bh*power;
    const r2=power<0.4?70:power<0.7?200:240;
    const g2=power<0.4?210:power<0.7?140:45;
    const fg=ctx.createLinearGradient(bx,by+bh-fh,bx,by+bh);
    fg.addColorStop(0,`rgb(${r2},${g2},30)`); fg.addColorStop(1,`rgb(${Math.min(255,r2+40)},${g2},20)`);
    ctx.fillStyle=fg;
    ctx.beginPath(); ctx.roundRect(bx,by+bh-fh,bw,fh,6); ctx.fill();
  }
  ctx.fillStyle='rgba(255,255,255,0.4)';
  ctx.font='bold 7px Inter,system-ui'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('PWR',bx+bw/2,by+4);
}

// ── Cue Ball Hit Position Selector ────────────────────────────────────────────
function CueBallControl({ hitPos, onChange, disabled }) {
  const SIZE=52, ref=useRef(null);
  const dragging=useRef(false);

  const update=(e)=>{
    if (!ref.current) return;
    const rect=ref.current.getBoundingClientRect();
    const x=((e.clientX-rect.left)-SIZE)/SIZE;
    const y=((e.clientY-rect.top)-SIZE)/SIZE;
    const len=Math.sqrt(x*x+y*y);
    if (len>1) return;
    onChange({x,y});
  };

  useEffect(()=>{
    const up=()=>{dragging.current=false;};
    const move=(e)=>{if(dragging.current)update(e);};
    window.addEventListener('mousemove',move);
    window.addEventListener('mouseup',up);
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[onChange]);

  const label=()=>{
    const {x,y}=hitPos;
    if(Math.abs(x)<0.18&&Math.abs(y)<0.18) return 'Centro';
    if(y<-0.3&&Math.abs(x)<0.35) return '▲ Topspin';
    if(y>0.3&&Math.abs(x)<0.35)  return '▼ Retro';
    if(x<-0.3&&Math.abs(y)<0.35) return '◄ Efecto izq.';
    if(x>0.3&&Math.abs(y)<0.35)  return '► Efecto der.';
    return 'Efecto combo';
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
      <div style={{fontSize:8,fontFamily:'Unbounded,system-ui',color:'var(--c-text4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
        Punto de golpe
      </div>
      <div
        ref={ref}
        onMouseDown={e=>{if(!disabled){dragging.current=true;update(e);}}}
        onClick={e=>{if(!disabled)update(e);}}
        style={{
          width:SIZE*2, height:SIZE*2, borderRadius:'50%', position:'relative',
          background:'radial-gradient(circle at 38% 35%, #f5f0e8 0%, #c8bb96 60%, #a89870 100%)',
          border:'2px solid rgba(255,255,255,0.18)',
          boxShadow:'0 0 0 1px rgba(0,0,0,0.4),inset 0 0 18px rgba(0,0,0,0.18)',
          cursor:disabled?'default':'crosshair', userSelect:'none',
        }}
      >
        {/* Specular on control ball */}
        <div style={{position:'absolute',top:'12%',left:'14%',width:'30%',height:'25%',borderRadius:'50%',background:'radial-gradient(rgba(255,255,255,0.7),rgba(255,255,255,0))',pointerEvents:'none'}}/>
        {/* Grid lines */}
        <div style={{position:'absolute',left:'50%',top:'8%',bottom:'8%',width:1,background:'rgba(0,0,0,0.15)',transform:'translateX(-50%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'50%',left:'8%',right:'8%',height:1,background:'rgba(0,0,0,0.15)',transform:'translateY(-50%)',pointerEvents:'none'}}/>
        {/* Labels */}
        {[['T',50,6],['B',50,80],['L',6,50],['R',80,50]].map(([l,lx,ly])=>(
          <div key={l} style={{position:'absolute',left:`${lx}%`,top:`${ly}%`,transform:'translate(-50%,-50%)',fontSize:7,color:'rgba(0,0,0,0.35)',fontFamily:'Inter,system-ui',pointerEvents:'none',fontWeight:700}}>{l}</div>
        ))}
        {/* Hit point */}
        <div style={{
          position:'absolute',
          left:`calc(50% + ${hitPos.x*(SIZE-9)}px - 5px)`,
          top: `calc(50% + ${hitPos.y*(SIZE-9)}px - 5px)`,
          width:10,height:10,borderRadius:'50%',
          background:'#ff2d7a',
          boxShadow:'0 0 7px rgba(255,45,122,0.8)',
          border:'1.5px solid #fff',
          pointerEvents:'none',
          transition:'left 0.04s,top 0.04s',
        }}/>
      </div>
      <div style={{fontSize:9,color:'var(--c-accent)',fontFamily:'Unbounded,system-ui',fontWeight:700,letterSpacing:'0.05em'}}>
        {label()}
      </div>
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function RoomList({ onJoin, onSolo }) {
  const [rooms,setRooms]=useState([]);
  const [creating,setCreating]=useState(false);
  const [name,setName]=useState('');
  const [mode,setMode]=useState('1v1');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const load=()=>api.billiardsGetRooms().then(setRooms).catch(()=>{});
    load(); const iv=setInterval(load,3000); return()=>clearInterval(iv);
  },[]);

  const create=async()=>{
    setLoading(true);
    try{
      const room=await api.billiardsCreateRoom({name:name||'Mesa Billar',mode});
      await api.billiardsJoinRoom(room.id).catch(()=>{});
      const r=await api.billiardsGetRoom(room.id);
      onJoin(room.id,r.state);
    }catch(e){alert(e.message);}
    setLoading(false);
  };

  const join=async(id)=>{
    setLoading(true);
    try{await api.billiardsJoinRoom(id);const r=await api.billiardsGetRoom(id);onJoin(id,r.state);}
    catch(e){alert(e.message);}
    setLoading(false);
  };

  return(
    <div style={{maxWidth:640,margin:'0 auto',padding:'24px 16px'}}>
      <div style={{fontFamily:'Unbounded,system-ui',fontSize:'1.3rem',fontWeight:800,color:'#fff',marginBottom:24}}>
        🎱 Billar <span style={{color:'var(--c-accent)'}}>8-Ball</span>
      </div>
      {/* Solo practice button */}
      <button onClick={onSolo} style={{width:'100%',padding:12,marginBottom:10,borderRadius:10,background:'rgba(111,255,125,0.1)',border:'1px solid rgba(111,255,125,0.35)',color:'var(--c-accent2)',fontFamily:'Unbounded,system-ui',fontSize:'0.72rem',fontWeight:700,cursor:'pointer',letterSpacing:'0.06em'}}>
        🎱 PRÁCTICA SOLO — sin servidor
      </button>

      {!creating?(
        <button onClick={()=>setCreating(true)} style={{width:'100%',padding:12,marginBottom:20,borderRadius:10,background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',border:'none',color:'#fff',fontFamily:'Unbounded,system-ui',fontSize:'0.75rem',fontWeight:700,cursor:'pointer'}}>
          + CREAR MESA MULTIJUGADOR
        </button>
      ):(
        <div style={{background:'var(--c-surface)',border:'1px solid rgba(255,45,122,0.2)',borderRadius:12,padding:'16px 20px',marginBottom:20}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la mesa"
              style={{background:'var(--c-bg1)',border:'1px solid var(--c-line2)',borderRadius:8,padding:'10px 14px',color:'#fff',fontFamily:'Inter,system-ui'}}/>
            <div style={{display:'flex',gap:8}}>
              {['1v1','2v2'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{
                  flex:1,padding:10,borderRadius:8,
                  background:mode===m?'rgba(255,45,122,0.15)':'var(--c-surface2)',
                  border:`1px solid ${mode===m?'rgba(255,45,122,0.4)':'var(--c-line2)'}`,
                  color:mode===m?'#ff2d7a':'var(--c-text3)',
                  fontFamily:'Unbounded,system-ui',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',
                }}>{m}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={create} disabled={loading} style={{flex:1,padding:10,borderRadius:8,background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',border:'none',color:'#fff',fontWeight:700,cursor:'pointer'}}>
                Crear y Entrar
              </button>
              <button onClick={()=>setCreating(false)} style={{padding:'10px 14px',borderRadius:8,background:'var(--c-surface2)',border:'1px solid var(--c-line2)',color:'var(--c-text3)',cursor:'pointer'}}>✕</button>
            </div>
          </div>
        </div>
      )}
      {rooms.length===0&&!creating&&<div style={{textAlign:'center',color:'var(--c-text3)',padding:'40px 0',fontSize:14}}>No hay mesas activas. ¡Creá una!</div>}
      {rooms.map(r=>{
        const s=r.state||{};
        const cnt=s.players?.length||0,isFull=cnt>=(s.maxPlayers||2),isPlaying=s.phase==='playing';
        return(
          <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',marginBottom:10,background:'var(--c-surface)',border:'1px solid var(--c-line2)',borderRadius:12}}>
            <div>
              <div style={{fontWeight:700,color:'#fff',fontSize:14}}>{s.name||'Mesa Billar'} <span style={{color:'var(--c-text4)',fontSize:11}}>· {s.mode||'1v1'}</span></div>
              <div style={{fontSize:11,color:'var(--c-text3)',marginTop:3}}>{cnt}/{s.maxPlayers||2} jugadores · {isPlaying?'En juego':'Esperando'}</div>
            </div>
            <button disabled={isFull||isPlaying||loading} onClick={()=>join(r.id)} style={{
              padding:'8px 16px',borderRadius:8,
              background:(isFull||isPlaying)?'var(--c-surface2)':'rgba(255,45,122,0.12)',
              border:`1px solid ${(isFull||isPlaying)?'var(--c-line2)':'rgba(255,45,122,0.4)'}`,
              color:(isFull||isPlaying)?'var(--c-text4)':'#ff2d7a',
              fontWeight:700,fontSize:'0.75rem',cursor:(isFull||isPlaying)?'not-allowed':'pointer',
            }}>{isPlaying?'En juego':isFull?'Llena':'Unirse →'}</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Billiards({ user }) {
  const [view,setView]              = useState('lobby');
  const [roomId,setRoomId]          = useState(null);
  const [serverState,setServerState]= useState(null);
  const [balls,setBalls]            = useState(null);
  const [angle,setAngle]            = useState(0);
  const [power,setPowerState]       = useState(0);
  const [hitPos,setHitPos]          = useState({x:0,y:0});
  const [err,setErr]                = useState('');
  const [muted,setMuted]            = useState(casinoAudio.muted);
  // Solo mode pocketed tracking for display
  const [soloPocketed,setSoloPocketed] = useState([]);

  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const chargeRaf   = useRef(null);
  const chargeStart = useRef(null);
  const pocketedRef = useRef([]);
  const foulRef     = useRef(false);
  // ── Refs that hold live values so callbacks never have stale closures ──
  const angleRef    = useRef(0);
  const powerRef    = useRef(0);
  const hitPosRef   = useRef({x:0,y:0});
  const gamePhaseRef= useRef('waiting');   // source of truth for callbacks
  const ballsRef    = useRef(null);        // always current balls
  const isTurnRef   = useRef(false);       // always current turn flag
  const [gamePhaseUI, setGamePhaseUI] = useState('waiting'); // for rendering only

  // Wrapped setters that keep refs in sync
  const setGamePhase = useCallback((p)=>{ gamePhaseRef.current=p; setGamePhaseUI(p); },[]);
  const setPower     = useCallback((v)=>{ const n=typeof v==='function'?v(powerRef.current):v; powerRef.current=n; setPowerState(n); },[]);

  useEffect(()=>{ angleRef.current=angle; },[angle]);
  useEffect(()=>{ hitPosRef.current=hitPos; },[hitPos]);

  // Sync server balls → local on new server state (only when idle)
  useEffect(()=>{
    if(!serverState?.balls) return;
    const lb=serverState.balls.map(b=>({...b,vx:0,vy:0}));
    setBalls(lb); ballsRef.current=lb;
  },[serverState?.balls]);

  // Polling (multiplayer only)
  useEffect(()=>{
    if(!roomId||view!=='game') return;
    const poll=async()=>{try{const r=await api.billiardsGetRoom(roomId);setServerState(r.state);}catch{}};
    poll(); const iv=setInterval(poll,2000); return()=>clearInterval(iv);
  },[roomId,view]);

  // Derived multiplayer values
  const state      = serverState||{};
  const players    = state.players||[], teams=state.teams||[];
  const myTeamIdx  = players.find(p=>p.userId===user.id)?.team??-1;
  const myTeam     = teams[myTeamIdx]||{playerIds:[],group:null,pocketed:[]};
  const oppTeam    = teams[1-myTeamIdx]||{playerIds:[],group:null,pocketed:[]};
  const curTeam    = teams[state.currentTeam]||{playerIds:[]};
  const curPlayerId= curTeam.playerIds[state.currentPlayerInTeam%Math.max(1,curTeam.playerIds.length)];

  const isSolo  = view==='solo';
  const gamePhase = gamePhaseUI;
  // isMyTurn: always true in solo, otherwise check player
  const isMyTurn = isSolo
    ? gamePhase!=='animating'
    : (curPlayerId===user.id&&state.phase==='playing'&&gamePhase!=='animating');
  isTurnRef.current = isMyTurn;

  const cueBall = balls?.find(b=>b.id===0);

  // ── Render loop (reads live refs so it never has stale values) ──
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas||!balls) return;
    const ctx=canvas.getContext('2d');
    const render=()=>{
      const ph=gamePhaseRef.current;
      const imt=isTurnRef.current;
      const cb=ballsRef.current?.find(b=>b.id===0);
      const ang=angleRef.current;
      const pwr=powerRef.current;
      const hp=hitPosRef.current;
      const curBalls=ballsRef.current||[];

      ctx.clearRect(0,0,CW,CH);
      drawTable(ctx);
      if(imt&&ph==='aiming'&&cb)    drawAimLine(ctx,cb,curBalls,ang);
      if(imt&&ph==='placing'&&cb){
        ctx.beginPath();ctx.arc(FX+cb.x,FY+cb.y,BALL_R+5,0,Math.PI*2);
        ctx.strokeStyle='rgba(111,255,125,0.6)';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
      }
      curBalls.forEach(b=>draw3DBall(ctx,b,b.id===0&&imt&&ph==='aiming'?hp:null));
      if(imt&&(ph==='aiming'||ph==='charging')&&cb) drawCue(ctx,cb,ang,pwr);
      if(imt&&ph!=='placing') drawPowerBar(ctx,pwr);
      rafRef.current=requestAnimationFrame(render);
    };
    rafRef.current=requestAnimationFrame(render);
    return()=>cancelAnimationFrame(rafRef.current);
  // Only re-subscribe when balls object identity changes (new rack / new game)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[balls]);

  // ── Physics runner (shared by solo + multiplayer) ──
  const runPhysics = useCallback((snapshot, onDone)=>{
    const lb=snapshot.map(b=>({...b}));
    ballsRef.current=lb;
    pocketedRef.current=[]; foulRef.current=false;
    const shotAngle=angleRef.current;
    const spinState={hx:hitPosRef.current.x,hy:hitPosRef.current.y,sdx:Math.cos(shotAngle),sdy:Math.sin(shotAngle),applied:false};
    let steps=0;
    cancelAnimationFrame(rafRef.current);
    const tick=()=>{
      for(let s=0;s<4;s++){
        const p=stepPhysics(lb,spinState);
        pocketedRef.current.push(...p);
        if(p.includes(0)) foulRef.current=true;
      }
      ballsRef.current=[...lb];
      setBalls([...lb]);
      if(!allStopped(lb)&&++steps<2200){
        rafRef.current=requestAnimationFrame(tick);
      } else {
        onDone(lb,[...new Set(pocketedRef.current)],foulRef.current);
      }
    };
    rafRef.current=requestAnimationFrame(tick);
  },[]);

  // ── toFelt: canvas px → felt coords ──
  const toFelt=useCallback((e)=>{
    const c=canvasRef.current; if(!c) return{x:0,y:0};
    const rect=c.getBoundingClientRect();
    return{x:(e.clientX-rect.left)*CW/rect.width-FX, y:(e.clientY-rect.top)*CH/rect.height-FY};
  },[]);

  // ── Mouse handlers — use refs only, no state in closures ──
  const handleMouseMove=useCallback((e)=>{
    if(!isTurnRef.current) return;
    const ph=gamePhaseRef.current;
    const cb=ballsRef.current?.find(b=>b.id===0); if(!cb) return;
    if(ph==='placing'){
      const{x,y}=toFelt(e);
      setBalls(prev=>{const n=prev.map(b=>b.id===0?{...b,x,y}:b);ballsRef.current=n;return n;});
      return;
    }
    if(ph==='aiming'){  // ← only update angle when AIMING, not when charging
      const{x,y}=toFelt(e);
      const a=Math.atan2(y-cb.y,x-cb.x);
      angleRef.current=a; setAngle(a);
    }
  },[toFelt]);

  const handleMouseDown=useCallback((e)=>{
    if(e.button!==0||!isTurnRef.current) return;
    const ph=gamePhaseRef.current;
    const cb=ballsRef.current?.find(b=>b.id===0); if(!cb) return;

    if(ph==='placing'){
      const{x,y}=toFelt(e);
      if(isSolo){
        // In solo mode, just place locally
        setBalls(prev=>{const n=prev.map(b=>b.id===0?{...b,x,y,pocketed:false}:b);ballsRef.current=n;return n;});
        setGamePhase('aiming');
      } else {
        api.billiardsPlaceCue(roomId,{x,y}).then(r=>{setServerState(r.state);setGamePhase('aiming');}).catch(er=>setErr(er.message));
      }
      return;
    }

    if(ph==='aiming'){
      setGamePhase('charging');
      powerRef.current=0; setPowerState(0);
      chargeStart.current=Date.now();
      const chargeTick=()=>{
        const p=Math.min(1,(Date.now()-chargeStart.current)/1600);
        powerRef.current=p; setPowerState(p);
        chargeRaf.current=requestAnimationFrame(chargeTick);
      };
      chargeRaf.current=requestAnimationFrame(chargeTick);
    }
  },[toFelt,isSolo,roomId,setGamePhase]);

  const handleMouseUp=useCallback((e)=>{
    if(e.button!==0||!isTurnRef.current) return;
    if(gamePhaseRef.current!=='charging') return;  // ← read ref, not state
    cancelAnimationFrame(chargeRaf.current);
    const p=powerRef.current;
    powerRef.current=0; setPowerState(0);
    setGamePhase('animating');

    const a=angleRef.current;
    const speed=p*28;
    const snapshot=(ballsRef.current||[]).map(b=>b.id===0?{...b,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed}:{...b});
    casinoAudio.playChip();

    runPhysics(snapshot,(finalBalls,pocketed,foulCue)=>{
      if(isSolo){
        // Solo mode: just re-rack cue if pocketed, update display
        if(foulCue){
          setBalls(prev=>{
            const n=prev.map(b=>b.id===0?{...b,x:FW*0.25,y:FH/2,pocketed:false,vx:0,vy:0}:b);
            ballsRef.current=n; return n;
          });
          setGamePhase('aiming');
        } else {
          setSoloPocketed(p=>[...new Set([...p,...pocketed.filter(id=>id!==0)])]);
          setGamePhase('aiming');
        }
      } else {
        setGamePhase('waiting');
        const fb=finalBalls.map(({id,x,y,pocketed})=>({id,x,y,pocketed}));
        api.billiardsShot(roomId,{balls:fb,pocketedThisShot:pocketed,foulCueBall:foulCue})
          .then(r=>{setServerState(r.state);if(foulCue)setGamePhase('placing');})
          .catch(er=>setErr(er.message));
      }
    });
  },[isSolo,roomId,setGamePhase,runPhysics]);

  // ── Phase transitions (multiplayer) ──
  useEffect(()=>{
    if(isSolo) return;
    if(!serverState) return;
    if(serverState.phase==='game_end'){setGamePhase('ended');return;}
    if(serverState.phase==='playing'){
      if(serverState.cueBallInHand&&isMyTurn){setGamePhase('placing');return;}
      const ph=gamePhaseRef.current;
      if(ph==='waiting'||ph==='ended') setGamePhase('aiming');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[serverState?.phase,serverState?.currentTeam,serverState?.cueBallInHand,isSolo]);

  useEffect(()=>{
    if(isSolo) return;
    if(isMyTurn&&gamePhaseRef.current==='waiting') setGamePhase('aiming');
    if(!isMyTurn&&gamePhaseRef.current==='aiming')  setGamePhase('waiting');
  },[isMyTurn,isSolo,setGamePhase]);

  // ── Handlers ──
  const handleJoin=(id,s)=>{setRoomId(id);setServerState(s);setView('game');setErr('');};

  const handleLeave=()=>{
    cancelAnimationFrame(rafRef.current); cancelAnimationFrame(chargeRaf.current);
    if(!isSolo) api.billiardsLeaveRoom(roomId).catch(()=>{});
    setView('lobby');setRoomId(null);setServerState(null);
    setBalls(null);ballsRef.current=null;
    setGamePhase('waiting'); powerRef.current=0; setPowerState(0);
  };

  const doStart=async()=>{try{const r=await api.billiardsStartGame(roomId);setServerState(r.state);}catch(e){setErr(e.message);}};
  const doRematch=async()=>{try{const r=await api.billiardsRematch(roomId);setServerState(r.state);setGamePhase('waiting');}catch(e){setErr(e.message);}};

  const startSolo=()=>{
    const b=makeRack(); ballsRef.current=b;
    setBalls(b); setSoloPocketed([]); setView('solo'); setGamePhase('aiming');
  };
  const resetSolo=()=>{
    cancelAnimationFrame(rafRef.current);
    const b=makeRack(); ballsRef.current=b;
    setBalls(b); setSoloPocketed([]); setGamePhase('aiming');
  };

  if(view==='lobby') return <RoomList onJoin={handleJoin} onSolo={startSolo}/>;

  const isWaiting=!isSolo&&state.phase==='waiting';
  const isGameEnd=!isSolo&&state.phase==='game_end';
  const iWon=isGameEnd&&state.winner===myTeamIdx;
  const curPlayerName=players.find(p=>p.userId===curPlayerId)?.username||'';
  const canStart=isWaiting&&players.length>=2;

  return(
    <div className="casino-roul-view">
      {/* ── LEFT PANEL ── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Billar 8-Ball</div>
        <div style={{textAlign:'center',fontSize:9,fontFamily:'Unbounded,system-ui',fontWeight:700,letterSpacing:'0.1em',color:'var(--c-text4)'}}>
          {isSolo ? 'PRÁCTICA SOLO' : `${state.mode?.toUpperCase()||'1V1'} · ${players.length}/${state.maxPlayers||2} jugadores`}
        </div>

        {/* Solo pocketed balls */}
        {isSolo&&soloPocketed.length>0&&(
          <div style={{background:'var(--c-surface2)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:9,fontFamily:'Unbounded,system-ui',color:'var(--c-text4)',letterSpacing:'0.08em',marginBottom:6}}>EMBOCADAS</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {soloPocketed.map(id=>(
                <div key={id} style={{width:16,height:16,borderRadius:'50%',background:BCLR[id]||'#fff',border:'1px solid rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:800,color:id<=7||id===8?'#fff':BCLR[id]}}>{id}</div>
              ))}
            </div>
          </div>
        )}

        {/* Multiplayer teams */}
        {!isSolo&&state.phase==='playing'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[{t:myTeam,isMe:true},{t:oppTeam,isMe:false}].map(({t,isMe})=>(
              <div key={isMe?'me':'opp'} style={{background:'var(--c-surface2)',borderRadius:10,padding:'10px 12px',border:isMe?'1px solid rgba(255,45,122,0.25)':'1px solid var(--c-line2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:9,fontFamily:'Unbounded,system-ui',fontWeight:700,color:isMe?'var(--c-accent)':'var(--c-text3)',letterSpacing:'0.08em'}}>{isMe?'TU EQUIPO':'RIVALES'}</span>
                  <span style={{fontSize:9,fontWeight:700,color:t.group==='solids'?'#f5c518':t.group==='stripes'?'#4a90e2':'var(--c-text4)',fontFamily:'Unbounded,system-ui'}}>{t.group?t.group.toUpperCase():'?'}</span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {(t.pocketed||[]).map(id=>(
                    <div key={id} style={{width:16,height:16,borderRadius:'50%',background:BCLR[id]||'#fff',border:'1px solid rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:800,color:'#fff'}}>{id}</div>
                  ))}
                  {(t.pocketed||[]).length===0&&<span style={{fontSize:9,color:'var(--c-text4)'}}>sin bolillas</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hit position control — always shown when aiming */}
        {isMyTurn&&gamePhase==='aiming'&&(
          <CueBallControl hitPos={hitPos} onChange={(p)=>{setHitPos(p);hitPosRef.current=p;}} disabled={false}/>
        )}

        {/* Turn indicator */}
        {(isSolo||state.phase==='playing')&&(
          <div style={{borderRadius:8,padding:'10px 12px',textAlign:'center',background:isMyTurn?'rgba(111,255,125,0.07)':'rgba(255,215,0,0.04)',border:`1px solid ${isMyTurn?'rgba(111,255,125,0.3)':'rgba(255,215,0,0.15)'}`}}>
            {isMyTurn?(
              <>
                <div style={{fontSize:8,fontFamily:'Unbounded,system-ui',color:'var(--c-accent2)',letterSpacing:'0.1em',marginBottom:4}}>
                  {isSolo?'● PRÁCTICA LIBRE':'● TU TURNO'}
                </div>
                <div style={{fontSize:11,color:'var(--c-text2)'}}>
                  {gamePhase==='placing'?'Click para colocar la bola blanca':
                   gamePhase==='charging'?'¡Soltá para disparar!':
                   'Apuntá → ajustá efecto → mantené para cargar'}
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:8,fontFamily:'Unbounded,system-ui',color:'#ffd700',letterSpacing:'0.1em',marginBottom:4}}>TURNO DE</div>
                <div style={{fontSize:12,fontWeight:700,color:'#ffd700'}}>{curPlayerName}</div>
              </>
            )}
          </div>
        )}

        {/* Power bar */}
        {isMyTurn&&gamePhase==='charging'&&(
          <div>
            <div style={{fontSize:9,color:'var(--c-text4)',fontFamily:'Unbounded,system-ui',letterSpacing:'0.08em',marginBottom:6}}>POTENCIA</div>
            <div style={{height:8,background:'var(--c-surface3)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,width:`${power*100}%`,background:power<0.4?'#6fff7d':power<0.7?'#f5c518':'#ff6b35'}}/>
            </div>
          </div>
        )}

        {/* Solo reset */}
        {isSolo&&<button onClick={resetSolo} style={{width:'100%',padding:10,borderRadius:8,background:'rgba(111,255,125,0.08)',border:'1px solid rgba(111,255,125,0.3)',color:'var(--c-accent2)',fontFamily:'Unbounded,system-ui',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',letterSpacing:'0.06em'}}>↺ NUEVA MESA</button>}

        {/* Game end */}
        {isGameEnd&&(
          <div style={{borderRadius:10,padding:14,textAlign:'center',background:iWon?'rgba(111,255,125,0.07)':'rgba(255,45,122,0.07)',border:`1px solid ${iWon?'rgba(111,255,125,0.3)':'rgba(255,45,122,0.3)'}`}}>
            <div style={{fontFamily:'Unbounded,system-ui',fontSize:'1.1rem',fontWeight:800,color:iWon?'var(--c-accent2)':'var(--c-accent)',marginBottom:8}}>
              {iWon?'🏆 ¡GANASTE!':'💀 PERDISTE'}
            </div>
            <button onClick={doRematch} style={{width:'100%',padding:10,borderRadius:8,background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',border:'none',color:'#fff',fontFamily:'Unbounded,system-ui',fontSize:'0.7rem',fontWeight:700,cursor:'pointer',letterSpacing:'0.06em'}}>REVANCHA</button>
          </div>
        )}

        {canStart&&<button onClick={doStart} className="roul-spin-btn">EMPEZAR PARTIDA</button>}
        {isWaiting&&!canStart&&<div style={{textAlign:'center',color:'var(--c-text3)',fontSize:12}}>Esperando jugadores… ({players.length}/{state.maxPlayers||2})</div>}
        {err&&<div className="casino-err">{err}</div>}

        <div style={{display:'flex',gap:8,marginTop:'auto',paddingTop:20}}>
          <button onClick={()=>setMuted(casinoAudio.toggleMute())} style={{width:36,height:36,borderRadius:8,border:'1px solid var(--c-line2)',background:'none',color:'var(--c-text3)',cursor:'pointer',fontSize:'1rem'}}>{muted?'🔇':'🔊'}</button>
          <button onClick={handleLeave} style={{flex:1,background:'none',border:'1px solid var(--c-line2)',borderRadius:8,padding:'8px 14px',cursor:'pointer',color:'var(--c-text3)',fontFamily:'Inter,system-ui',fontWeight:600,fontSize:'0.8rem'}}>← Salir</button>
        </div>
      </div>

      {/* ── CANVAS STAGE ── */}
      <div className="casino-roul-stage" style={{padding:0,overflow:'hidden',minHeight:520,
        cursor:isMyTurn&&gamePhase==='aiming'?'crosshair':isMyTurn&&gamePhase==='placing'?'cell':isMyTurn&&gamePhase==='charging'?'none':'default'}}>
        <canvas
          ref={canvasRef} width={CW} height={CH}
          style={{width:'100%',height:'auto',display:'block',userSelect:'none'}}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={e=>e.preventDefault()}
        />
      </div>
    </div>
  );
}
