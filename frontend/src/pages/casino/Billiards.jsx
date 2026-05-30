import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/api';

// Our customized fork of tailuge/billiards (GPL-3.0).
const POOL_URL = 'https://ant1gravity-billiards.vercel.app/embed.html';
const POOL_ORIGIN = 'https://ant1gravity-billiards.vercel.app';
const BET_PRESETS = [0, 100, 500, 1000, 5000, 10000];

// ── Room card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, onJoin, busy }) {
  const isFull   = room.players.length >= room.maxPlayers;
  const isPlaying = room.status !== 'waiting';
  const disabled = isFull || isPlaying || busy;
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 18px', marginBottom:10,
      background:'var(--c-surface)',
      border:'1px solid var(--c-line2)', borderRadius:12,
    }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>
          {room.name}
          <span style={{ marginLeft:8, color:'var(--c-text4)', fontSize:11 }}>· {room.mode}</span>
        </div>
        <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
          <span>👥 {room.players.length}/{room.maxPlayers}</span>
          {room.bet > 0 ? (
            <span style={{ color:'#ffd700' }}>🪙 {room.bet.toLocaleString('es-AR')} TK</span>
          ) : (
            <span style={{ color:'var(--c-text4)' }}>Sin apuesta</span>
          )}
          <span style={{ color: isPlaying ? '#ffd700' : '#6fff7d' }}>
            ● {isPlaying ? (room.status === 'finished' ? 'Terminada' : 'En juego') : 'Esperando'}
          </span>
        </div>
        {room.players.length > 0 && (
          <div style={{ fontSize:10, color:'var(--c-text4)', marginTop:4 }}>
            {room.players.map(p => p.username).join(' · ')}
          </div>
        )}
      </div>
      <button disabled={disabled} onClick={() => onJoin(room.id)} style={{
        padding:'8px 18px', borderRadius:8,
        background: disabled ? 'var(--c-surface2)' : 'rgba(255,45,122,0.12)',
        border: `1px solid ${disabled ? 'var(--c-line2)' : 'rgba(255,45,122,0.4)'}`,
        color: disabled ? 'var(--c-text4)' : '#ff2d7a',
        fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.7rem', letterSpacing:'0.06em',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
        {isFull ? 'Llena' : isPlaying ? 'En juego' : 'Unirse →'}
      </button>
    </div>
  );
}

// ── Lobby screen ──────────────────────────────────────────────────────────────
function Lobby({ onEnterRoom, onSolo, balance }) {
  const [rooms, setRooms]       = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState('');
  const [mode, setMode]         = useState('1v1');
  const [bet, setBet]           = useState(0);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => {
    const load = () => api.billiardsGetRooms().then(setRooms).catch(()=>{});
    load(); const iv = setInterval(load, 3000); return () => clearInterval(iv);
  }, []);

  const create = async () => {
    setBusy(true); setErr('');
    try {
      const room = await api.billiardsCreateRoom({ name: name || 'Mesa Billar', mode, bet });
      onEnterRoom(room);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const join = async (id) => {
    setBusy(true); setErr('');
    try {
      const room = await api.billiardsJoinRoom(id);
      onEnterRoom(room);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.4rem', fontWeight:800, color:'#fff' }}>
          🎱 Billar <span style={{ color:'var(--c-accent)' }}>8-Ball</span>
        </div>
        <div style={{ fontSize:11, color:'var(--c-text3)' }}>
          Balance: <span style={{ color:'#6fff7d', fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{balance?.toLocaleString('es-AR') ?? '...'}</span> TK
        </div>
      </div>

      <button onClick={onSolo} style={{
        width:'100%', padding:12, marginBottom:10, borderRadius:10,
        background:'rgba(111,255,125,0.08)', border:'1px solid rgba(111,255,125,0.3)',
        color:'var(--c-accent2)', fontFamily:'Unbounded,system-ui',
        fontSize:'0.7rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em',
      }}>
        🎯 PRÁCTICA SOLO — sin apuesta
      </button>

      {!creating ? (
        <button onClick={()=>setCreating(true)} style={{
          width:'100%', padding:12, marginBottom:20, borderRadius:10,
          background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
          border:'none', color:'#fff', fontFamily:'Unbounded,system-ui',
          fontSize:'0.75rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em',
        }}>+ CREAR MESA</button>
      ) : (
        <div style={{ background:'var(--c-surface)', border:'1px solid rgba(255,45,122,0.2)', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <input
              value={name} onChange={e=>setName(e.target.value)} maxLength={30}
              placeholder="Nombre de la mesa"
              style={{ background:'var(--c-bg1)', border:'1px solid var(--c-line2)', borderRadius:8, padding:'10px 14px', color:'#fff', fontFamily:'Inter,system-ui' }}
            />

            <div>
              <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Modo</div>
              <div style={{ display:'flex', gap:8 }}>
                {['1v1','2v2'].map(m => (
                  <button key={m} onClick={()=>setMode(m)} style={{
                    flex:1, padding:10, borderRadius:8,
                    background: mode===m ? 'rgba(255,45,122,0.15)' : 'var(--c-surface2)',
                    border: `1px solid ${mode===m ? 'rgba(255,45,122,0.4)' : 'var(--c-line2)'}`,
                    color: mode===m ? '#ff2d7a' : 'var(--c-text3)',
                    fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.78rem', cursor:'pointer',
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Apuesta por jugador</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {BET_PRESETS.map(v => (
                  <button key={v} onClick={()=>setBet(v)} style={{
                    padding:'9px 6px', borderRadius:8,
                    background: bet===v ? 'rgba(255,215,0,0.10)' : 'var(--c-surface2)',
                    border: `1px solid ${bet===v ? 'rgba(255,215,0,0.4)' : 'var(--c-line2)'}`,
                    color: bet===v ? '#ffd700' : 'var(--c-text3)',
                    fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:'0.78rem', cursor:'pointer',
                  }}>{v === 0 ? 'GRATIS' : v >= 1000 ? `${v/1000}k` : v}</button>
                ))}
              </div>
              {bet > 0 && (
                <div style={{ fontSize:10, color:'var(--c-text4)', marginTop:6, textAlign:'center' }}>
                  Pozo total: <span style={{ color:'#ffd700', fontWeight:700 }}>{(bet * (mode==='2v2' ? 4 : 2)).toLocaleString('es-AR')} TK</span>
                  <span style={{ marginLeft:8, opacity:0.7 }}>(rake casino: 5%)</span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={create} disabled={busy} style={{
                flex:1, padding:10, borderRadius:8,
                background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
                border:'none', color:'#fff', fontWeight:700, cursor:'pointer',
                fontFamily:'Unbounded,system-ui', fontSize:'0.72rem', letterSpacing:'0.06em',
              }}>
                {busy ? 'CREANDO…' : `CREAR Y ENTRAR${bet > 0 ? ` · -${bet} TK` : ''}`}
              </button>
              <button onClick={()=>{ setCreating(false); setErr(''); }} style={{
                padding:'10px 14px', borderRadius:8, background:'var(--c-surface2)',
                border:'1px solid var(--c-line2)', color:'var(--c-text3)', cursor:'pointer',
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {err && <div className="casino-err" style={{ marginBottom:12 }}>{err}</div>}

      {rooms.length === 0 && !creating && (
        <div style={{ textAlign:'center', color:'var(--c-text3)', padding:'40px 0', fontSize:14 }}>
          No hay mesas activas. ¡Creá una!
        </div>
      )}

      {rooms.map(r => <RoomCard key={r.id} room={r} onJoin={join} busy={busy} />)}
    </div>
  );
}

// ── Waiting room (after join, before game starts) ────────────────────────────
function WaitingRoom({ room, user, onLeave, onPlay }) {
  return (
    <div style={{ maxWidth:520, margin:'40px auto', padding:'24px', textAlign:'center', background:'var(--c-surface)', border:'1px solid var(--c-line2)', borderRadius:14 }}>
      <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
        Mesa #{room.id} · {room.mode}
      </div>
      <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.4rem', fontWeight:800, color:'#fff', marginBottom:14 }}>
        {room.name}
      </div>

      <div style={{ display:'flex', justifyContent:'space-around', marginBottom:20, padding:'14px 0', background:'var(--c-surface2)', borderRadius:10 }}>
        <div>
          <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.1em', textTransform:'uppercase' }}>Apuesta</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.2rem', color: room.bet > 0 ? '#ffd700' : 'var(--c-text3)' }}>
            {room.bet > 0 ? `${room.bet.toLocaleString('es-AR')} TK` : 'GRATIS'}
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.1em', textTransform:'uppercase' }}>Pozo</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.2rem', color:'var(--c-accent2)' }}>
            {room.pot.toLocaleString('es-AR')} TK
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.1em', textTransform:'uppercase' }}>Jugadores</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.2rem', color:'#fff' }}>
            {room.players.length}/{room.maxPlayers}
          </div>
        </div>
      </div>

      {/* Players by team */}
      <div style={{ display:'grid', gridTemplateColumns: room.mode === '2v2' ? '1fr 1fr' : '1fr', gap:10, marginBottom:20 }}>
        {[0, 1].map(t => {
          const teamPlayers = room.players.filter(p => p.team === t);
          if (room.mode === '1v1' && teamPlayers.length === 0 && t === 1) {
            return (
              <div key={t} style={{ padding:'12px', border:'1px dashed var(--c-line2)', borderRadius:10, fontSize:11, color:'var(--c-text4)' }}>
                Esperando oponente…
              </div>
            );
          }
          return (
            <div key={t} style={{
              padding:'12px', borderRadius:10,
              background: t === 0 ? 'rgba(111,255,125,0.06)' : 'rgba(255,159,74,0.06)',
              border: `1px solid ${t === 0 ? 'rgba(111,255,125,0.25)' : 'rgba(255,159,74,0.25)'}`,
            }}>
              <div style={{
                fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700,
                color: t === 0 ? 'var(--c-accent2)' : '#ff9f4a',
                letterSpacing:'0.1em', marginBottom:6,
              }}>EQUIPO {t+1}</div>
              {teamPlayers.length === 0 && room.mode === '2v2' && (
                <div style={{ fontSize:11, color:'var(--c-text4)' }}>Esperando…</div>
              )}
              {teamPlayers.map(p => (
                <div key={p.userId} style={{
                  fontWeight: p.userId === user.id ? 700 : 600,
                  color: p.userId === user.id ? '#fff' : 'var(--c-text2)',
                  fontSize:13, marginBottom:3,
                }}>
                  {p.username}{p.userId === user.id ? ' (vos)' : ''}
                </div>
              ))}
              {room.mode === '2v2' && Array.from({ length: 2 - teamPlayers.length }).map((_,i) => (
                <div key={`s${i}`} style={{ fontSize:11, color:'var(--c-text4)' }}>Asiento libre</div>
              ))}
            </div>
          );
        })}
      </div>

      {room.status === 'waiting' ? (
        <div style={{ color:'var(--c-text3)', marginBottom:16, fontSize:13 }}>
          ⏳ Esperando que se llene la sala…
        </div>
      ) : (
        <button onClick={onPlay} style={{
          width:'100%', padding:14, borderRadius:10,
          background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)', border:'none', color:'#fff',
          fontFamily:'Unbounded,system-ui', fontWeight:800, fontSize:'0.8rem', letterSpacing:'0.08em',
          cursor:'pointer',
        }}>
          🎱 ENTRAR A LA MESA
        </button>
      )}

      <button onClick={onLeave} style={{
        marginTop:12, padding:'10px 24px', borderRadius:8,
        background:'none', border:'1px solid var(--c-line2)',
        color:'var(--c-text3)', cursor:'pointer',
        fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
      }}>
        {room.status === 'waiting' ? '← Salir (reembolso)' : '← Volver al lobby'}
      </button>
    </div>
  );
}

// ── In-game iframe with result handling ──────────────────────────────────────
function PoolGame({ room, user, onLeave, onResult }) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Build the iframe URL with the params tailuge needs for network multiplayer.
  // - websocketserver:  tells the fork to use online sync (else it's single-player local)
  // - tableId:          shared by all players in this room (state syncs across clients)
  // - userId:           unique per player so the server distinguishes them
  // - userName:         display name in the HUD
  // - first=true:       ONLY the room creator (players[0]) gets this — they break first
  // - ruletype:         locked to eightball in our fork
  const url = (() => {
    const isFirst = room.players[0]?.userId === user.id;
    const params = new URLSearchParams({
      ruletype: 'eightball',
      websocketserver: 'wss://billiards-network.onrender.com',
      tableId: `ant1g_${room.id}`,
      userId: String(user.id),
      userName: user.username,
    });
    if (isFirst) params.set('first', 'true');
    return `${POOL_URL}?${params.toString()}`;
  })();

  // Listen for game-end postMessage from the fork
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== POOL_ORIGIN) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'ant1g-pool-result') return;
      onResult({ winnerUsername: String(data.winner || '').trim() });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onResult]);

  const handleLeave = () => {
    if (room.bet > 0 && room.status === 'playing' && !showLeaveConfirm) {
      setShowLeaveConfirm(true);
      return;
    }
    onLeave();
  };

  const me  = room.players.find(p => p.userId === user.id);
  const team = me?.team ?? -1;
  const opponents = room.players.filter(p => p.team !== team);
  const teammates = room.players.filter(p => p.team === team && p.userId !== user.id);

  return (
    <div className="casino-roul-view">
      {/* ── LEFT PANEL ── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Billar · {room.mode}</div>

        <div style={{ background:'var(--c-surface2)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', color:'var(--c-text4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Pozo</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.4rem', color: room.bet > 0 ? '#ffd700' : 'var(--c-text3)' }}>
            {room.pot.toLocaleString('es-AR')} TK
          </div>
          {room.bet > 0 && (
            <div style={{ fontSize:9, color:'var(--c-text4)', marginTop:2 }}>Ganador se lleva ~{Math.floor(room.pot * 0.95).toLocaleString('es-AR')}</div>
          )}
        </div>

        <div style={{ background:'rgba(111,255,125,0.06)', border:'1px solid rgba(111,255,125,0.25)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--c-accent2)', marginBottom:6 }}>Tu equipo</div>
          <div style={{ fontSize:12, color:'#fff', fontWeight:700 }}>{user.username} (vos)</div>
          {teammates.map(t => (
            <div key={t.userId} style={{ fontSize:11, color:'var(--c-text2)', marginTop:2 }}>{t.username}</div>
          ))}
        </div>

        <div style={{ background:'rgba(255,159,74,0.05)', border:'1px solid rgba(255,159,74,0.2)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#ff9f4a', marginBottom:6 }}>Rivales</div>
          {opponents.map(o => (
            <div key={o.userId} style={{ fontSize:12, color:'var(--c-text2)', marginBottom:2 }}>{o.username}</div>
          ))}
          {opponents.length === 0 && <div style={{ fontSize:11, color:'var(--c-text4)' }}>Esperando…</div>}
        </div>

        <div style={{ fontSize:10, color:'var(--c-text4)', textAlign:'center', lineHeight:1.6, padding:'8px 0' }}>
          Mesa #{room.id}<br/>
          Físicas reales · top-down<br/>
          Multi sync activo
        </div>

        {showLeaveConfirm && (
          <div style={{ background:'rgba(255,45,122,0.08)', border:'1px solid rgba(255,45,122,0.3)', borderRadius:8, padding:'10px 12px', fontSize:11, color:'#fff' }}>
            ⚠️ Si abandonás ahora, perdés tu apuesta. ¿Confirmás?
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <button onClick={onLeave} style={{ flex:1, padding:'6px', borderRadius:6, background:'#ff2d7a', border:'none', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:11 }}>Sí, salir</button>
              <button onClick={()=>setShowLeaveConfirm(false)} style={{ flex:1, padding:'6px', borderRadius:6, background:'var(--c-surface2)', border:'1px solid var(--c-line2)', color:'var(--c-text3)', cursor:'pointer', fontSize:11 }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button onClick={handleLeave} style={{
            flex:1, background:'none', border:'1px solid var(--c-line2)', borderRadius:8,
            padding:'8px 14px', cursor:'pointer', color:'var(--c-text3)',
            fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
          }}>← Salir</button>
        </div>
      </div>

      {/* ── IFRAME ── */}
      <div style={{
        position:'relative', width:'100%',
        aspectRatio:'16 / 10', minHeight:540, maxHeight:780,
        background:'#000', borderRadius:12, overflow:'hidden', border:'1px solid var(--c-line2)',
      }}>
        <iframe
          src={url}
          title="ANT1GRAVITY Billar"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', display:'block' }}
          allow="autoplay; fullscreen; gamepad"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

// ── Solo practice (no room, just iframe) ──────────────────────────────────────
function SoloPractice({ user, onLeave }) {
  const url = `${POOL_URL}?ruletype=eightball&playername=${encodeURIComponent(user.username || 'anon')}`;
  return (
    <div className="casino-roul-view">
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Práctica Solo</div>
        <div style={{ fontSize:11, color:'var(--c-text3)', textAlign:'center', padding:'8px 0' }}>
          Modo libre · sin apuestas · sin oponentes
        </div>
        <div style={{ background:'rgba(111,255,125,0.06)', border:'1px solid rgba(111,255,125,0.25)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:11, color:'var(--c-text2)', lineHeight:1.7 }}>
            🖱️ Mover · apuntar<br/>
            🎯 Slider lateral · potencia<br/>
            🎱 Click sobre bola blanca · efecto<br/>
            🔨 Botón hit · disparar
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button onClick={onLeave} style={{
            flex:1, background:'none', border:'1px solid var(--c-line2)', borderRadius:8,
            padding:'8px 14px', cursor:'pointer', color:'var(--c-text3)',
            fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
          }}>← Volver al lobby</button>
        </div>
      </div>
      <div style={{
        position:'relative', width:'100%',
        aspectRatio:'16 / 10', minHeight:540, maxHeight:780,
        background:'#000', borderRadius:12, overflow:'hidden', border:'1px solid var(--c-line2)',
      }}>
        <iframe src={url} title="Billar Solo" style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', display:'block' }} allow="autoplay; fullscreen" />
      </div>
    </div>
  );
}

// ── Game result banner ────────────────────────────────────────────────────────
function ResultBanner({ room, user, onClose }) {
  const me = room.players.find(p => p.userId === user.id);
  const myTeam = me?.team ?? -1;
  const winners = room.players.filter(p => p.team !== undefined && p.team !== myTeam && room.winnerName?.includes(p.username));
  const iWon = room.winnerName?.includes(user.username);
  const winnings = Math.floor(room.pot * 0.95 / (room.mode === '2v2' ? 2 : 1));

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999,
    }}>
      <div style={{
        background:'var(--c-surface)', border:`2px solid ${iWon ? '#6fff7d' : '#ff2d7a'}`,
        borderRadius:16, padding:'30px 40px', textAlign:'center', maxWidth:420,
        boxShadow: iWon ? '0 0 40px rgba(111,255,125,0.4)' : '0 0 40px rgba(255,45,122,0.3)',
      }}>
        <div style={{ fontSize:'3rem', marginBottom:10 }}>{iWon ? '🏆' : '💀'}</div>
        <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.6rem', fontWeight:800, color: iWon ? '#6fff7d' : '#ff2d7a', marginBottom:8 }}>
          {iWon ? '¡GANASTE!' : 'PERDISTE'}
        </div>
        <div style={{ fontSize:12, color:'var(--c-text3)', marginBottom:16 }}>
          Ganador: <span style={{ color:'#fff', fontWeight:700 }}>{room.winnerName}</span>
        </div>
        {iWon && room.bet > 0 && (
          <div style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
            <div style={{ fontSize:9, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui', letterSpacing:'0.1em', textTransform:'uppercase' }}>Ganaste</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.4rem', color:'#ffd700' }}>
              +{winnings.toLocaleString('es-AR')} TK
            </div>
          </div>
        )}
        <button onClick={onClose} style={{
          padding:'12px 28px', borderRadius:8,
          background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)', border:'none', color:'#fff',
          fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.75rem', letterSpacing:'0.08em',
          cursor:'pointer',
        }}>Volver al lobby</button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Billiards({ user, balance, onBalanceChange }) {
  const [view, setView] = useState('lobby');     // lobby | waiting | playing | solo
  const [room, setRoom] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const pollingRef = useRef(null);

  // Poll active room state
  useEffect(() => {
    if (!room || view === 'lobby' || view === 'solo') return;
    const poll = async () => {
      try {
        const r = await api.billiardsGetRoom(room.id);
        setRoom(r);
        if (r.status === 'finished' && !showResult) {
          setShowResult(true);
          if (onBalanceChange) {
            api.me?.().then(u => onBalanceChange(u.coins)).catch(()=>{});
          }
        }
      } catch {}
    };
    poll();
    pollingRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollingRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, view]);

  const handleEnterRoom = (r) => {
    setRoom(r);
    setView(r.status === 'playing' ? 'playing' : 'waiting');
  };

  const handleLeave = async () => {
    if (room) {
      try { await api.billiardsLeaveRoom(room.id); } catch {}
      if (onBalanceChange) api.me?.().then(u => onBalanceChange(u.coins)).catch(()=>{});
    }
    setView('lobby'); setRoom(null); setShowResult(false);
  };

  const handleStartPlaying = () => setView('playing');

  const handleResult = useCallback(async ({ winnerUsername }) => {
    if (!room || !winnerUsername) return;
    try {
      await api.billiardsResult(room.id, { winnerUsername });
    } catch (e) {
      // Other player may have reported it first — ignore
    }
  }, [room]);

  const handleSolo = () => setView('solo');

  return (
    <>
      {view === 'lobby' && (
        <Lobby balance={balance} onEnterRoom={handleEnterRoom} onSolo={handleSolo} />
      )}
      {view === 'waiting' && room && (
        <WaitingRoom room={room} user={user} onLeave={handleLeave} onPlay={handleStartPlaying} />
      )}
      {view === 'playing' && room && (
        <PoolGame room={room} user={user} onLeave={handleLeave} onResult={handleResult} />
      )}
      {view === 'solo' && (
        <SoloPractice user={user} onLeave={handleLeave} />
      )}
      {showResult && room && (
        <ResultBanner room={room} user={user} onClose={handleLeave} />
      )}
    </>
  );
}
