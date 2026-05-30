import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/api';
import { casinoAudio } from '../../utils/casinoAudio';

// ── Dot layouts (x%,y%) for values 0-6 ───────────────────────────────────────
const DOTS = {
  0: [],
  1: [[50,50]],
  2: [[25,28],[75,72]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
};

function DominoHalf({ value, size = 36, dark = false }) {
  return (
    <div style={{
      width: size, height: size,
      background: dark ? '#1a1a2e' : '#f8f4e8',
      borderRadius: 4, position: 'relative', flexShrink: 0,
    }}>
      {(DOTS[value] || []).map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)`,
          width: 8, height: 8, borderRadius: '50%',
          background: dark ? '#e8d44d' : '#1a1a2e',
        }} />
      ))}
    </div>
  );
}

function DominoTile({ a, b, selected, playable, onClick, small = false, horizontal = false }) {
  const half = small ? 24 : 36;
  const gap  = small ? 2  : 3;
  const border = selected
    ? '2px solid #ff2d7a'
    : playable
      ? '2px solid rgba(111,255,125,0.6)'
      : '1px solid rgba(255,255,255,0.08)';

  const inner = horizontal ? (
    <div style={{ display:'flex', flexDirection:'row', gap, padding: small?3:5, alignItems:'center' }}>
      <DominoHalf value={a} size={half} />
      <div style={{ width: small?2:3, height:half, background:'rgba(0,0,0,0.4)', borderRadius:1 }} />
      <DominoHalf value={b} size={half} />
    </div>
  ) : (
    <div style={{ display:'flex', flexDirection:'column', gap, padding: small?3:5, alignItems:'center' }}>
      <DominoHalf value={a} size={half} />
      <div style={{ height:small?2:3, width:half, background:'rgba(0,0,0,0.4)', borderRadius:1 }} />
      <DominoHalf value={b} size={half} />
    </div>
  );

  return (
    <div onClick={playable || selected ? onClick : undefined} style={{
      background: selected ? 'rgba(255,45,122,0.12)' : 'rgba(255,255,255,0.04)',
      border, borderRadius: 8,
      cursor: (playable || selected) ? 'pointer' : 'default',
      transition: 'all 0.15s',
      boxShadow: selected ? '0 0 14px rgba(255,45,122,0.4)' : playable ? '0 0 10px rgba(111,255,125,0.2)' : 'none',
      userSelect: 'none',
    }}>
      {inner}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function RoomList({ onJoin }) {
  const [rooms, setRooms]   = useState([]);
  const [name, setName]     = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const load = () => api.dominoGetRooms().then(setRooms).catch(()=>{});
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      const room = await api.dominoCreateRoom({ name: name || 'Mesa Dominó' });
      const joined = await api.dominoJoinRoom(room.id).catch(()=>null);
      const r = await api.dominoGetRoom(room.id);
      onJoin(room.id, r.state, r.myTiles);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const join = async (id) => {
    setLoading(true);
    try {
      await api.dominoJoinRoom(id);
      const r = await api.dominoGetRoom(id);
      onJoin(id, r.state, r.myTiles);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ fontFamily:'Unbounded,system-ui', fontSize:'1.3rem', fontWeight:800, color:'#fff', marginBottom:24 }}>
        🁣 Dominó <span style={{ color:'var(--c-accent)' }}>2×2</span>
      </div>

      {/* Create room */}
      {!creating ? (
        <button onClick={()=>setCreating(true)} style={{
          width:'100%', padding:'14px', marginBottom:20, borderRadius:10,
          background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
          border:'none', color:'#fff', fontFamily:'Unbounded,system-ui',
          fontSize:'0.75rem', fontWeight:700, cursor:'pointer', letterSpacing:'0.06em',
        }}>+ CREAR MESA</button>
      ) : (
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la mesa"
            style={{ flex:1, background:'var(--c-surface2)', border:'1px solid var(--c-line2)', borderRadius:8,
              padding:'10px 14px', color:'var(--c-text)', fontFamily:'Inter,system-ui', fontSize:'0.85rem' }} />
          <button onClick={create} disabled={loading} style={{
            padding:'10px 18px', borderRadius:8, background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
            border:'none', color:'#fff', fontWeight:700, fontFamily:'Inter,system-ui', cursor:'pointer',
          }}>Crear</button>
          <button onClick={()=>setCreating(false)} style={{
            padding:'10px 14px', borderRadius:8, background:'var(--c-surface2)',
            border:'1px solid var(--c-line2)', color:'var(--c-text3)', cursor:'pointer',
          }}>✕</button>
        </div>
      )}

      {/* Room list */}
      {rooms.length === 0 && (
        <div style={{ textAlign:'center', color:'var(--c-text3)', padding:'40px 0', fontSize:14 }}>
          No hay mesas activas. ¡Creá una!
        </div>
      )}
      {rooms.map(r => {
        const s = r.state || {};
        const count = s.players?.length || 0;
        const isFull = count >= 4;
        const isPlaying = s.phase !== 'waiting';
        return (
          <div key={r.id} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 18px', marginBottom:10,
            background:'var(--c-surface)', border:'1px solid var(--c-line2)', borderRadius:12,
          }}>
            <div>
              <div style={{ fontWeight:700, color:'#fff', fontSize:14 }}>{s.name || 'Mesa Dominó'}</div>
              <div style={{ fontSize:11, color:'var(--c-text3)', marginTop:3 }}>
                {count}/4 jugadores · {isPlaying ? `En juego — ${s.phase}` : 'Esperando'}
              </div>
            </div>
            <button disabled={isFull||isPlaying||loading} onClick={()=>join(r.id)} style={{
              padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,45,122,0.4)',
              background: (isFull||isPlaying) ? 'var(--c-surface2)' : 'rgba(255,45,122,0.12)',
              color: (isFull||isPlaying) ? 'var(--c-text4)' : '#ff2d7a',
              fontWeight:700, fontSize:'0.75rem', fontFamily:'Inter,system-ui', cursor:(isFull||isPlaying)?'not-allowed':'pointer',
            }}>
              {isPlaying ? 'En juego' : isFull ? 'Llena' : 'Unirse →'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Board renderer ─────────────────────────────────────────────────────────────
function DominoBoard({ pieces, boardLeft, boardRight }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [pieces?.length]);

  if (!pieces || pieces.length === 0) {
    return (
      <div style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        border:'2px dashed var(--c-line2)', borderRadius:16, minHeight:120,
        color:'var(--c-text4)', fontFamily:'Inter,system-ui', fontSize:13,
      }}>
        El jugador con la ficha más alta empieza la partida
      </div>
    );
  }

  return (
    <div ref={ref} style={{
      flex:1, overflowX:'auto', display:'flex', alignItems:'center',
      gap:4, padding:'16px 12px', background:'rgba(0,0,0,0.15)',
      borderRadius:16, minHeight:120,
    }}>
      <div style={{
        fontSize:'0.65rem', color:'var(--c-text4)', fontFamily:'Unbounded,system-ui',
        letterSpacing:'0.1em', textTransform:'uppercase', marginRight:8, flexShrink:0,
      }}>{boardLeft}◄</div>
      {pieces.map((p, i) => (
        <DominoTile key={i} a={p.a} b={p.b} small horizontal />
      ))}
      <div style={{
        fontSize:'0.65rem', color:'var(--c-text4)', fontFamily:'Unbounded,system-ui',
        letterSpacing:'0.1em', textTransform:'uppercase', marginLeft:8, flexShrink:0,
      }}>►{boardRight}</div>
    </div>
  );
}

// ── Player seat around the board ──────────────────────────────────────────────
function PlayerSeat({ player, isCurrentTurn, myUserId, position }) {
  if (!player) return (
    <div style={{
      padding:'8px 14px', borderRadius:8, border:'1px dashed var(--c-line2)',
      color:'var(--c-text4)', fontSize:12, fontFamily:'Inter,system-ui',
      textAlign:'center', minWidth:100,
    }}>Esperando...</div>
  );
  const isMe = player.userId === myUserId;
  const teamColor = player.team === 0 ? '#6fff7d' : '#ff9f4a';
  return (
    <div style={{
      padding:'8px 14px', borderRadius:8, minWidth:100, textAlign:'center',
      background: isCurrentTurn ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isCurrentTurn ? 'rgba(255,215,0,0.35)' : 'var(--c-line2)'}`,
      boxShadow: isCurrentTurn ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
      transition:'all 0.2s',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color: isMe ? 'var(--c-accent)' : '#fff', marginBottom:3 }}>
        {player.username}{isMe ? ' (vos)' : ''}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:6, alignItems:'center' }}>
        <span style={{ fontSize:10, color:teamColor, fontFamily:'Unbounded,system-ui', fontWeight:700 }}>
          Equipo {player.team + 1}
        </span>
        <span style={{ fontSize:10, color:'var(--c-text3)' }}>· {player.tileCount} fichas</span>
      </div>
      {isCurrentTurn && <div style={{ fontSize:9, color:'#ffd700', marginTop:4, fontFamily:'Unbounded,system-ui' }}>● SU TURNO</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Domino({ user }) {
  const [view, setView]           = useState('lobby');
  const [roomId, setRoomId]       = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myTiles, setMyTiles]     = useState([]);
  const [selected, setSelected]   = useState(null);   // [a,b]
  const [sideMenu, setSideMenu]   = useState(false);  // show left/right choice
  const [err, setErr]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [turnSecs, setTurnSecs]   = useState(null);
  const [muted, setMuted]         = useState(casinoAudio.muted);

  const turnTimerRef  = useRef(null);
  const prevTurnRef   = useRef(null);
  const prevPhaseRef  = useRef('');
  const nextRoundRef  = useRef(null);

  // ── Polling ──
  useEffect(() => {
    if (!roomId || view !== 'game') return;
    const poll = async () => {
      try {
        const r = await api.dominoGetRoom(roomId);
        setGameState(r.state);
        if (r.myTiles?.length) setMyTiles(r.myTiles);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [roomId, view]);

  // ── Audio & turn state tracking ──
  useEffect(() => {
    if (!gameState) return;
    const state   = gameState;
    const curIdx  = state.currentIdx;
    const curId   = state.players?.[curIdx]?.userId;
    const isMyTurn = curId === user.id && state.phase === 'playing';

    if (state.phase !== prevPhaseRef.current) {
      if (state.phase === 'round_end' || state.phase === 'game_end') {
        const winTeam = state.roundWinner?.team;
        const myTeam  = state.players?.find(p=>p.userId===user.id)?.team;
        winTeam === myTeam ? casinoAudio.playWin() : casinoAudio.playLose();
      }
    }
    prevPhaseRef.current = state.phase;

    if (isMyTurn && prevTurnRef.current !== curIdx + '_' + state.phase) {
      casinoAudio.playTurnAlert();
      prevTurnRef.current = curIdx + '_' + state.phase;
    }
  }, [gameState, user.id]);

  // ── 15-second turn timer ──
  useEffect(() => {
    if (!gameState) return;
    const state   = gameState;
    const curIdx  = state.currentIdx;
    const curId   = state.players?.[curIdx]?.userId;
    const isMyTurn = curId === user.id && state.phase === 'playing';

    if (isMyTurn) {
      setTurnSecs(15);
      clearInterval(turnTimerRef.current);
      let s = 15;
      turnTimerRef.current = setInterval(() => {
        s--;
        setTurnSecs(s);
        if (s <= 0) {
          clearInterval(turnTimerRef.current);
          setTurnSecs(null);
          // Auto-pass
          api.dominoPass(roomId).then(r => {
            setGameState(r.state);
            if (r.myTiles?.length) setMyTiles(r.myTiles);
          }).catch(() => {
            // If can't pass, auto-fold to first playable tile
          });
        }
      }, 1000);
    } else {
      clearInterval(turnTimerRef.current);
      setTurnSecs(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentIdx, gameState?.phase]);

  // ── Auto next-round timer ──
  useEffect(() => {
    if (gameState?.phase === 'round_end' && !nextRoundRef.current) {
      nextRoundRef.current = setTimeout(async () => {
        nextRoundRef.current = null;
        try {
          const r = await api.dominoNextRound(roomId);
          setGameState(r.state);
          setMyTiles(r.myTiles || []);
          setSelected(null); setSideMenu(false);
        } catch {}
      }, 5000);
    }
    if (gameState?.phase !== 'round_end') {
      clearTimeout(nextRoundRef.current);
      nextRoundRef.current = null;
    }
    return () => {};
  }, [gameState?.phase, roomId]);

  useEffect(() => () => {
    clearInterval(turnTimerRef.current);
    clearTimeout(nextRoundRef.current);
  }, []);

  const handleJoin = (id, state, tiles) => {
    setRoomId(id); setGameState(state); setMyTiles(tiles||[]); setView('game'); setErr('');
  };

  const handleLeave = async () => {
    clearInterval(turnTimerRef.current); clearTimeout(nextRoundRef.current);
    try { await api.dominoLeaveRoom(roomId); } catch {}
    setView('lobby'); setRoomId(null); setGameState(null); setMyTiles([]); setSelected(null);
  };

  const doPlay = useCallback(async (tile, side) => {
    setLoading(true); setErr('');
    try {
      const r = await api.dominoPlay(roomId, { tile, side });
      setGameState(r.state);
      setMyTiles(r.myTiles || []);
      setSelected(null); setSideMenu(false);
      casinoAudio.playChip();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [roomId]);

  const doPass = async () => {
    setLoading(true); setErr('');
    try {
      const r = await api.dominoPass(roomId);
      setGameState(r.state);
      setMyTiles(r.myTiles||[]);
      setSelected(null); setSideMenu(false);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const doStart = async () => {
    setErr('');
    try {
      const r = await api.dominoStartGame(roomId);
      setGameState(r.state);
      setMyTiles(r.myTiles||[]);
    } catch (e) { setErr(e.message); }
  };

  const selectTile = (tile) => {
    if (!isMyTurn || loading) return;
    if (selected && selected[0]===tile[0] && selected[1]===tile[1]) {
      setSelected(null); setSideMenu(false); return;
    }
    setSelected(tile);
    // Determine which sides are valid
    const empty = !state.boardPieces?.length;
    if (empty) { doPlay(tile, 'right'); return; }
    const canLeft  = tile[0]===state.boardLeft  || tile[1]===state.boardLeft;
    const canRight = tile[0]===state.boardRight || tile[1]===state.boardRight;
    if (canLeft && canRight && state.boardLeft !== state.boardRight) {
      setSideMenu(true); // ask which side
    } else if (canLeft) {
      doPlay(tile, 'left');
    } else if (canRight) {
      doPlay(tile, 'right');
    } else {
      setErr('Esa ficha no encaja en ningún extremo');
      setSelected(null);
    }
  };

  if (view === 'lobby') return <RoomList onJoin={handleJoin} />;

  const state       = gameState || {};
  const players     = state.players || [];
  const me          = players.find(p => p.userId === user.id);
  const curPlayer   = players[state.currentIdx];
  const isMyTurn    = curPlayer?.userId === user.id && state.phase === 'playing';
  const isWaiting   = state.phase === 'waiting';
  const isRoundEnd  = state.phase === 'round_end';
  const isGameEnd   = state.phase === 'game_end';
  const canStart    = isWaiting && players.length >= 2 && me;
  const myTeam      = me?.team ?? 0;
  const oppTeam     = myTeam === 0 ? 1 : 0;

  // Which of my tiles are playable
  const empty = !state.boardPieces?.length;
  const playableTiles = new Set(
    myTiles.filter(t => canPlayAnywhere(t)).map(t => `${t[0]},${t[1]}`)
  );
  function canPlayAnywhere(t) {
    if (empty) return true;
    return t[0]===state.boardLeft||t[1]===state.boardLeft||t[0]===state.boardRight||t[1]===state.boardRight;
  }
  const hasPlayable = myTiles.some(t => canPlayAnywhere(t));

  // Seat arrangement (3 opponents shown on stage, me in panel)
  // p[0]=me(implied in panel), p[1]=left opp, p[2]=top opp/teammate, p[3]=right opp
  const myIdx   = players.findIndex(p=>p.userId===user.id);
  const seatOf  = (offset) => players[(myIdx + offset) % players.length] || null;
  const leftP   = seatOf(1);
  const topP    = seatOf(2);
  const rightP  = seatOf(3);

  return (
    <div className="casino-roul-view">

      {/* ── LEFT PANEL ───────────────────────────────── */}
      <div className="casino-roul-panel">

        {/* Title */}
        <div className="casino-roul-panel__title">🁣 Dominó</div>

        {/* Score */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:8,
        }}>
          {[0,1].map(t => (
            <div key={t} style={{
              background:'var(--c-surface2)', borderRadius:10, padding:'10px 12px', textAlign:'center',
              border: myTeam===t ? '1px solid rgba(111,255,125,0.3)' : '1px solid var(--c-line2)',
            }}>
              <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em',
                textTransform:'uppercase', color: myTeam===t ? 'var(--c-accent2)' : 'var(--c-text4)', marginBottom:4 }}>
                {myTeam===t ? 'Nuestro equipo' : 'Rivales'}
              </div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.4rem',
                color: myTeam===t ? 'var(--c-accent2)' : '#ff6b6b' }}>
                {state.scores?.[t] ?? 0}
              </div>
              <div style={{ fontSize:9, color:'var(--c-text4)' }}>/{state.maxPoints ?? 100} pts</div>
            </div>
          ))}
        </div>

        {/* Turn timer */}
        {isMyTurn && turnSecs !== null && (
          <div style={{
            borderRadius:8, padding:'10px 12px', textAlign:'center',
            background: turnSecs<=5 ? 'rgba(255,45,122,0.10)' : 'rgba(255,215,0,0.05)',
            border: `1px solid ${turnSecs<=5 ? 'rgba(255,45,122,0.4)' : 'rgba(255,215,0,0.2)'}`,
            transition:'all 0.3s',
          }}>
            <div style={{ fontSize:8, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui',
              letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Tu turno</div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:800, fontSize:'1.6rem',
              color: turnSecs<=5 ? '#ff2d7a' : '#ffd700' }}>
              {turnSecs}s
            </div>
            <div style={{ height:3, background:'var(--c-line2)', borderRadius:2, marginTop:6, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:2,
                width:`${(turnSecs/15)*100}%`,
                background: turnSecs<=5 ? '#ff2d7a' : '#ffd700',
                transition:'width 1s linear, background 0.3s',
              }} />
            </div>
          </div>
        )}

        {!isMyTurn && !isWaiting && curPlayer && (
          <div style={{
            borderRadius:8, padding:'8px 12px', textAlign:'center',
            background:'rgba(255,215,0,0.04)', border:'1px solid rgba(255,215,0,0.15)',
          }}>
            <div style={{ fontSize:8, color:'var(--c-text4)', fontFamily:'Unbounded,system-ui',
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Turno de</div>
            <div style={{ fontWeight:700, color:'#ffd700', fontFamily:'Inter,system-ui' }}>
              {curPlayer.username}
            </div>
          </div>
        )}

        {/* My tiles */}
        {state.phase === 'playing' && myTiles.length > 0 && (
          <div>
            <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700, letterSpacing:'0.1em',
              textTransform:'uppercase', color:'var(--c-text4)', marginBottom:8 }}>
              Mis fichas ({myTiles.length})
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {myTiles.map((t, i) => {
                const key = `${t[0]},${t[1]}`;
                const isPlayable = isMyTurn && playableTiles.has(key);
                const isSel = selected && selected[0]===t[0] && selected[1]===t[1];
                return (
                  <DominoTile
                    key={i} a={t[0]} b={t[1]}
                    selected={isSel} playable={isPlayable}
                    onClick={() => selectTile(t)}
                  />
                );
              })}
            </div>

            {/* Side chooser */}
            {sideMenu && selected && (
              <div style={{ marginTop:10, display:'flex', gap:8 }}>
                <button onClick={()=>{ setSideMenu(false); doPlay(selected,'left'); }} style={{
                  flex:1, padding:'8px', borderRadius:8, border:'1px solid rgba(111,255,125,0.4)',
                  background:'rgba(111,255,125,0.08)', color:'#6fff7d',
                  fontFamily:'Unbounded,system-ui', fontSize:'0.65rem', fontWeight:700, cursor:'pointer',
                }}>◄ Izquierda ({state.boardLeft})</button>
                <button onClick={()=>{ setSideMenu(false); doPlay(selected,'right'); }} style={{
                  flex:1, padding:'8px', borderRadius:8, border:'1px solid rgba(255,159,74,0.4)',
                  background:'rgba(255,159,74,0.08)', color:'#ff9f4a',
                  fontFamily:'Unbounded,system-ui', fontSize:'0.65rem', fontWeight:700, cursor:'pointer',
                }}>Derecha ({state.boardRight}) ►</button>
              </div>
            )}

            {/* Pass button */}
            {isMyTurn && !hasPlayable && (
              <button onClick={doPass} disabled={loading} style={{
                width:'100%', marginTop:10, padding:'10px', borderRadius:8,
                background:'rgba(255,45,122,0.08)', border:'1px solid rgba(255,45,122,0.3)',
                color:'#ff2d7a', fontFamily:'Unbounded,system-ui', fontSize:'0.68rem',
                fontWeight:700, cursor:'pointer', letterSpacing:'0.06em',
              }}>PASAR TURNO</button>
            )}
          </div>
        )}

        {/* Round/game end banner */}
        {(isRoundEnd || isGameEnd) && state.roundWinner && (
          <div style={{
            background:'rgba(111,255,125,0.05)', border:'1px solid rgba(111,255,125,0.25)',
            borderRadius:10, padding:'14px', textAlign:'center',
          }}>
            <div style={{ fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700,
              letterSpacing:'0.12em', color:'var(--c-accent2)', textTransform:'uppercase', marginBottom:6 }}>
              {isGameEnd ? '🏆 Fin del juego' : `Ronda terminada`}
            </div>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:4 }}>
              {state.roundWinner.reason === 'domino'
                ? `¡Dominó! ${state.roundWinner.winner}`
                : 'Partida bloqueada'}
            </div>
            <div style={{ fontSize:12, color:'var(--c-text3)' }}>
              Equipo {state.roundWinner.team+1} · +{state.roundWinner.points} pts
            </div>
            {isGameEnd && (
              <div style={{ marginTop:10, fontFamily:'Unbounded,system-ui', fontWeight:800,
                fontSize:'0.9rem', color: state.roundWinner.team===myTeam ? 'var(--c-accent2)' : '#ff6b6b' }}>
                {state.roundWinner.team===myTeam ? '¡GANARON!' : 'Perdieron'}
              </div>
            )}
            {isRoundEnd && <div style={{ fontSize:10, color:'var(--c-text4)', marginTop:8 }}>Nueva ronda en 5s...</div>}
          </div>
        )}

        {/* Start button */}
        {canStart && (
          <button onClick={doStart} className="roul-spin-btn">
            COMENZAR PARTIDA ({players.length}/4)
          </button>
        )}
        {isWaiting && !canStart && me && (
          <div style={{ textAlign:'center', color:'var(--c-text3)', fontSize:12, fontFamily:'Inter,system-ui' }}>
            Esperando jugadores... ({players.length}/4)
          </div>
        )}

        {err && <div className="casino-err">{err}</div>}

        {/* Footer */}
        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button onClick={()=>setMuted(casinoAudio.toggleMute())} style={{
            width:36, height:36, borderRadius:8, border:'1px solid var(--c-line2)',
            background:'none', color:'var(--c-text3)', cursor:'pointer', fontSize:'1rem',
          }}>{muted?'🔇':'🔊'}</button>
          <button onClick={handleLeave} style={{
            flex:1, background:'none', border:'1px solid var(--c-line2)', borderRadius:8,
            padding:'8px 14px', cursor:'pointer', color:'var(--c-text3)',
            fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
          }}>← Salir</button>
        </div>
      </div>

      {/* ── RIGHT STAGE ──────────────────────────────── */}
      <div className="casino-roul-stage" style={{ flexDirection:'column', gap:16, minHeight:520 }}>

        {/* Opponent seats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
          <PlayerSeat player={leftP}  isCurrentTurn={leftP&&curPlayer?.userId===leftP.userId}  myUserId={user.id} position="left" />
          <PlayerSeat player={topP}   isCurrentTurn={topP&&curPlayer?.userId===topP.userId}   myUserId={user.id} position="top" />
          <PlayerSeat player={rightP} isCurrentTurn={rightP&&curPlayer?.userId===rightP.userId} myUserId={user.id} position="right" />
        </div>

        {/* Board */}
        <DominoBoard
          pieces={state.boardPieces}
          boardLeft={state.boardLeft}
          boardRight={state.boardRight}
        />

        {/* My seat info */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <PlayerSeat player={me} isCurrentTurn={isMyTurn} myUserId={user.id} position="bottom" />
        </div>

        {/* Room info bar */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'10px 16px', background:'rgba(255,255,255,0.02)',
          border:'1px solid var(--c-line2)', borderRadius:10,
        }}>
          <span style={{ fontFamily:'Unbounded,system-ui', fontWeight:700, fontSize:'0.75rem', color:'#fff' }}>
            Mesa {roomId ? `#${roomId.slice(0,6).toUpperCase()}` : ''} · Dominó 2×2
          </span>
          <span style={{ fontSize:10, color:'var(--c-text4)' }}>
            {players.length}/4 jugadores · meta {state.maxPoints ?? 100} pts
          </span>
        </div>
      </div>
    </div>
  );
}
