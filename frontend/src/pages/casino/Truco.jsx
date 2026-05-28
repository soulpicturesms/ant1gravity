import React, { useState, useEffect } from 'react';
import { useGameSocket } from '../../context/SocketContext';

const PALO_ICON = { Espadas: '⚔️', Bastos: '🏑', Copas: '🏆', Oros: '🌟' };
const PALO_COLOR = { Espadas: '#00d4ff', Bastos: '#00cc66', Copas: '#a78bfa', Oros: '#ffd700' };

function TrucoCard({ card, onClick, played, selected }) {
  if (!card) return null;
  const col = PALO_COLOR[card.palo];
  return (
    <div onClick={onClick} style={{
      width: 70, height: 100, borderRadius: 8, cursor: onClick && !played ? 'pointer' : 'default',
      background: played ? '#0a0a14' : 'linear-gradient(135deg,#1a1a2e,#12122a)',
      border: `2px solid ${selected ? '#ffd700' : played ? '#1e1e30' : col + '66'}`,
      opacity: played ? 0.4 : 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s',
      boxShadow: selected ? `0 0 14px rgba(255,215,0,0.5)` : 'none',
      transform: selected ? 'translateY(-8px)' : 'none',
    }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: col }}>{card.num}</div>
      <div style={{ fontSize: '1.1rem' }}>{PALO_ICON[card.palo]}</div>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '0.65rem', color: col, letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1 }}>{card.palo}</div>
    </div>
  );
}

function RoomList({ rooms, onCreate, onJoin }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('1v1');
  const [show, setShow] = useState(false);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#00e8c0' }}>🀄 Salas de Truco</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShow(s => !s)}>
          {show ? '✕ Cancelar' : '+ Nueva Sala'}
        </button>
      </div>
      {show && (
        <div className="card" style={{ border: '1px solid rgba(0,232,192,0.3)', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Nueva partida</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" placeholder="Nombre de la sala..." value={name} onChange={e => setName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              {['1v1','2v2'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem',
                  border: `1px solid ${mode===m?'#00e8c0':'#1e1e30'}`,
                  background: mode===m?'rgba(0,232,192,0.1)':'transparent',
                  color: mode===m?'#00e8c0':'#6a6a8a',
                }}>{m}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => { onCreate({ name: name || 'Mesa de Truco', mode }); setShow(false); }}>
              Crear Sala
            </button>
          </div>
        </div>
      )}
      {rooms.length === 0 && <div className="empty"><div className="empty-icon">🀄</div><p>No hay salas. ¡Creá una!</p></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rooms.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'white' }}>{r.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 2 }}>{r.mode} · {r.players}/{r.maxPlayers} jugadores · {r.status}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onJoin(r.id)} disabled={r.status==='playing'}>
              {r.status==='playing' ? 'En juego' : 'Unirse →'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Truco({ user }) {
  const socket = useGameSocket('truco');
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [myEnvido, setMyEnvido] = useState(null);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([]);
  const [connected, setConnected] = useState(false);
  const [handResult, setHandResult] = useState(null);
  const [gameOver, setGameOver] = useState(null);

  const addLog = (msg) => setLog(l => [...l.slice(-19), msg]);

  useEffect(() => {
    if (!socket) return;
    socket.connect();
    socket.on('connect', () => { setConnected(true); socket.emit('rooms:list'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('rooms:list', setRooms);
    socket.on('game:state', state => { setRoom(state); setHandResult(null); });
    socket.on('game:hand', ({ cards, envido }) => { setMyCards(cards); setMyEnvido(envido); setSelected(null); addLog('📤 Nueva mano repartida'); });
    socket.on('game:card_played', ({ username, card }) => addLog(`${username} jugó ${card.num} de ${card.palo}`));
    socket.on('game:trick_result', ({ winnerTeam, draw }) => addLog(draw ? '🤝 Parda' : `🏆 Equipo ${winnerTeam + 1} gana la vuelta`));
    socket.on('game:truco_offer', ({ by, level }) => addLog(`⚔️ ${by} cantó ${['','Truco','Retruco','Vale Cuatro'][level]}`));
    socket.on('game:truco_accepted', ({ by }) => addLog(`✅ ${by} aceptó el truco`));
    socket.on('game:truco_rejected', ({ by }) => addLog(`❌ ${by} rechazó el truco`));
    socket.on('game:envido_offer', ({ by, type }) => addLog(`🎲 ${by} cantó ${type}`));
    socket.on('game:envido_result', ({ winnerTeam, pts, rejected }) => addLog(`${rejected ? '❌ Envido rechazado' : `🏆 Equipo ${winnerTeam+1} gana envido +${pts}`}`));
    socket.on('game:mazo', ({ by }) => addLog(`🃏 ${by} se fue al mazo`));
    socket.on('game:hand_end', data => { setHandResult(data); setMyCards([]); addLog(`🏁 Mano terminada. Puntaje: ${data.scores?.[0]}-${data.scores?.[1]}`); });
    socket.on('game:over', data => { setGameOver(data); addLog(`🏆 ¡Juego terminado! Gana equipo ${data.winnerTeam+1}`); });
    socket.on('room:created', ({ id }) => socket.emit('room:join', { roomId: id, user: { id: user.id, username: user.username } }));
    socket.on('error', msg => addLog('❌ ' + msg));
    return () => socket.disconnect();
  }, [socket, user]);

  const send = (ev, data) => socket?.emit(ev, data);

  const playCard = () => {
    if (selected === null || !room) return;
    send('game:play_card', { roomId: room.id, cardId: myCards[selected]?.id });
    setSelected(null);
  };

  const isMyTurn = room?.currentUserId === user.id;
  const myTeam = room?.players?.find(p => p.userId === user.id) ? (room.players.findIndex(p => p.userId === user.id) % 2) : -1;
  const scores = room?.scores || [0, 0];
  const hasTrucoOffer = room?.trucoOffer && room.trucoOffer.by !== user.id;
  const hasEnvidoOffer = room?.envidoOffer && room.envidoOffer.by !== user.id;

  if (!connected) return <div className="loading"><div className="spinner" />Conectando...</div>;

  if (!room) return (
    <RoomList
      rooms={rooms}
      onCreate={opts => send('room:create', { ...opts, user: { id: user.id, username: user.username } })}
      onJoin={id => send('room:join', { roomId: id, user: { id: user.id, username: user.username } })}
    />
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Scores */}
      <div className="card" style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 16, textAlign: 'center' }}>
        {[0, 1].map(t => (
          <div key={t} style={{ minWidth: 100 }}>
            <div style={{ fontSize: '0.75rem', color: '#6a6a8a', fontFamily: 'Rajdhani', marginBottom: 4 }}>EQUIPO {t + 1}{t === myTeam ? ' (vos)' : ''}</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: t === myTeam ? '#00e8c0' : '#e0e0f0' }}>{scores[t]}</div>
            <div style={{ height: 6, background: '#1a1a28', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(scores[t] / 15) * 100}%`, background: t === myTeam ? '#00e8c0' : '#6a6a8a', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: '#4a4a6a', marginTop: 2 }}>/15 puntos</div>
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="card" style={{ border: '2px solid #ffd700', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: '#ffd700' }}>
            🏆 {gameOver.winnerTeam === myTeam ? '¡GANASTE!' : 'Perdiste'}
          </div>
          <div style={{ color: '#9090b0', marginTop: 8 }}>Resultado final: {gameOver.scores[0]} — {gameOver.scores[1]}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
        <div>
          {/* Players & played cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, justifyContent: 'center' }}>
            {room.players?.map(p => (
              <div key={p.userId} style={{ textAlign: 'center', padding: '10px 14px', borderRadius: 10, border: `1px solid ${room.currentUserId === p.userId ? '#ffd700' : '#1e1e30'}`, background: p.userId === user.id ? 'rgba(0,232,192,0.05)' : 'rgba(255,255,255,0.02)', minWidth: 110 }}>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.88rem', color: p.userId === user.id ? '#00e8c0' : '#e0e0f0', marginBottom: 6 }}>
                  {room.currentUserId === p.userId ? '▶ ' : ''}{p.username}
                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#6a6a8a' }}>E{p.team + 1}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {p.playedCards?.map((c, i) => (
                    <div key={i} style={{ width: 36, height: 50, borderRadius: 4, background: '#12122a', border: `1px solid ${PALO_COLOR[c.palo]}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem', color: PALO_COLOR[c.palo] }}>{c.num}</div>
                      <div style={{ fontSize: '0.75rem' }}>{PALO_ICON[c.palo]}</div>
                    </div>
                  ))}
                  {Array.from({ length: p.remainingCards || 0 }, (_, i) => (
                    <div key={`r${i}`} style={{ width: 36, height: 50, borderRadius: 4, background: 'linear-gradient(135deg,#1a1a2e,#0f0f22)', border: '1px solid #2a2a3e' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* My hand */}
          {myCards.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginBottom: 10, fontFamily: 'Rajdhani', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                Tu mano {myEnvido !== null ? `· Envido: ${myEnvido} pts` : ''}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {myCards.map((c, i) => (
                  <TrucoCard key={c.id} card={c} selected={selected === i} onClick={() => setSelected(selected === i ? null : i)} />
                ))}
              </div>
              {selected !== null && isMyTurn && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className="btn btn-primary" onClick={playCard}>Jugar carta →</button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="card" style={{ border: '1px solid #1e1e30' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {room.status === 'waiting' && room.players?.length >= 2 && (
                <button className="btn btn-primary" onClick={() => send('game:start', { roomId: room.id })}>
                  🀄 Iniciar Partida
                </button>
              )}

              {/* Truco calls */}
              {room.phase === 'playing' && !room.trucoOffer && isMyTurn && (
                <button onClick={() => send('game:truco', { roomId: room.id, level: 1 })}
                  style={{ background: 'rgba(255,68,102,0.15)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                  ⚔️ Truco
                </button>
              )}
              {hasTrucoOffer && (
                <>
                  <button onClick={() => send('game:truco_response', { roomId: room.id, accept: true })}
                    style={{ background: 'rgba(0,204,102,0.15)', border: '1px solid rgba(0,204,102,0.4)', color: '#00cc66', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                    ✅ Quiero
                  </button>
                  <button onClick={() => send('game:truco_response', { roomId: room.id, accept: false })}
                    style={{ background: 'rgba(255,68,102,0.15)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                    ❌ No quiero
                  </button>
                </>
              )}

              {/* Envido calls */}
              {room.phase === 'playing' && !room.envidoSettled && !room.envidoOffer && isMyTurn && (
                <button onClick={() => send('game:envido', { roomId: room.id, type: 'envido' })}
                  style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', color: '#a78bfa', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                  🎲 Envido
                </button>
              )}
              {hasEnvidoOffer && (
                <>
                  <button onClick={() => send('game:envido_response', { roomId: room.id, accept: true })}
                    style={{ background: 'rgba(0,204,102,0.15)', border: '1px solid rgba(0,204,102,0.4)', color: '#00cc66', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                    ✅ Quiero
                  </button>
                  <button onClick={() => send('game:envido_response', { roomId: room.id, accept: false })}
                    style={{ background: 'rgba(255,68,102,0.15)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
                    ❌ No quiero
                  </button>
                </>
              )}

              {/* Mazo (rendirse) */}
              {room.phase === 'playing' && (
                <button onClick={() => { if (confirm('¿Ir al mazo?')) send('game:mazo', { roomId: room.id }); }}
                  style={{ background: 'transparent', border: '1px solid #2a2a3e', color: '#4a4a6a', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontSize: '0.8rem' }}>
                  Mazo
                </button>
              )}

              <button onClick={() => { send('room:leave', { roomId: room.id }); setRoom(null); setMyCards([]); socket.emit('rooms:list'); }}
                style={{ background: 'transparent', border: '1px solid #1e1e30', color: '#6a6a8a', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontSize: '0.8rem', marginLeft: 'auto' }}>
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* Game log */}
        <div className="card" style={{ border: '1px solid #1e1e30', display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
          <div className="card-title" style={{ marginBottom: 10, fontSize: '0.82rem' }}>📋 Log</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: '#9090b0', padding: '3px 0', borderBottom: '1px solid #1a1a28' }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
