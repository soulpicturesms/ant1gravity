import React, { useState, useEffect, useCallback } from 'react';
import { useGameSocket } from '../../context/SocketContext';

const SUIT_C = { '♥':'#ff4466','♦':'#ff4466','♠':'#e0e0f0','♣':'#e0e0f0' };

function Card({ card, small }) {
  if (!card) return <div style={{ width: small?40:56, height: small?56:80, borderRadius: 6, background: 'linear-gradient(135deg,#1a1a2e,#0f0f22)', border: '1px solid #2a2a3e', flexShrink: 0 }} />;
  return (
    <div style={{ width: small?40:56, height: small?56:80, borderRadius: 6, background: '#1a1a2e', border: '1px solid #2a2a3e', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 6px', flexShrink: 0 }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: small?'0.75rem':'0.9rem', color: SUIT_C[card.suit], lineHeight: 1 }}>{card.value}</div>
      <div style={{ textAlign: 'center', fontSize: small?'0.9rem':'1.1rem', color: SUIT_C[card.suit] }}>{card.suit}</div>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: small?'0.75rem':'0.9rem', color: SUIT_C[card.suit], alignSelf: 'flex-end', transform: 'rotate(180deg)', lineHeight: 1 }}>{card.value}</div>
    </div>
  );
}

function PlayerSeat({ player, isCurrent, isMe }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, border: `2px solid ${isCurrent ? '#ffd700' : isMe ? '#00d4ff' : '#1e1e30'}`, background: isMe ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)', minWidth: 130, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: isMe ? '#00d4ff' : '#e0e0f0', marginBottom: 4 }}>
        {isCurrent && '▶ '}{player.username}{isMe ? ' (vos)' : ''}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 6 }}>
        {player.holeCards?.map((c, i) => <Card key={i} card={c} small />)}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: '#ffd700', fontFamily: 'Rajdhani' }}>⚡ {player.chips?.toLocaleString()}</span>
        <span style={{ fontSize: '0.72rem', padding: '1px 8px', borderRadius: 10, background: player.status==='folded'?'rgba(255,68,102,0.15)':player.status==='allIn'?'rgba(255,215,0,0.15)':'rgba(0,204,102,0.15)', color: player.status==='folded'?'#ff4466':player.status==='allIn'?'#ffd700':'#00cc66', fontFamily: 'Rajdhani', fontWeight: 700 }}>
          {player.status==='folded'?'Fold':player.status==='allIn'?'All In':player.status}
        </span>
      </div>
      {player.roundBet > 0 && <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginTop: 4, fontFamily: 'Rajdhani' }}>Apostó: {player.roundBet?.toLocaleString()}</div>}
      {player.bestHand && <div style={{ fontSize: '0.72rem', color: '#ffd700', marginTop: 4, fontFamily: 'Rajdhani', fontWeight: 700 }}>{player.bestHand.name}</div>}
    </div>
  );
}

function RoomList({ rooms, onCreate, onJoin }) {
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState(100);
  const [maxP, setMaxP] = useState(6);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#a78bfa' }}>♠️ Salas de Poker</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(s => !s)}>
          {showCreate ? '✕ Cancelar' : '+ Nueva Sala'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ border: '1px solid rgba(167,139,250,0.3)', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Nueva mesa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" placeholder="Nombre de la sala..." value={name} onChange={e => setName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.78rem', color: '#6a6a8a', display: 'block', marginBottom: 4 }}>Buy-in (chips)</label>
                <input className="input" type="number" min="10" value={buyIn} onChange={e => setBuyIn(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.78rem', color: '#6a6a8a', display: 'block', marginBottom: 4 }}>Máx. jugadores</label>
                <select className="input" value={maxP} onChange={e => setMaxP(Number(e.target.value))}>
                  {[2,3,4,5,6].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { onCreate({ name: name || 'Mesa ANT1', buyIn, maxPlayers: maxP }); setShowCreate(false); }}>
              Crear Mesa
            </button>
          </div>
        </div>
      )}

      {rooms.length === 0 && <div className="empty"><div className="empty-icon">♠️</div><p>No hay salas. ¡Creá una!</p></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rooms.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'white' }}>{r.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 2 }}>
                Buy-in: {r.buyIn?.toLocaleString()} · {r.players}/{r.maxPlayers} jugadores · {r.status}
              </div>
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

export default function Poker({ user }) {
  const socket = useGameSocket('poker');
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [showdown, setShowdown] = useState(null);
  const [raiseAmt, setRaiseAmt] = useState('');
  const [connected, setConnected] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!socket) return;
    socket.connect();
    socket.on('connect', () => { setConnected(true); socket.emit('rooms:list'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('rooms:list', setRooms);
    socket.on('room:joined', ({ room }) => setRoom(room));
    socket.on('game:state', state => { setRoom(state); setShowdown(null); });
    socket.on('game:hole_cards', ({ holeCards }) => setMyCards(holeCards));
    socket.on('game:showdown', data => setShowdown(data));
    socket.on('game:hand_end', () => setMyCards([]));
    socket.on('room:created', ({ id }) => socket.emit('room:join', { roomId: id, user: { id: user.id, username: user.username } }));
    socket.on('error', msg => setMsg('❌ ' + msg));
    return () => socket.disconnect();
  }, [socket, user]);

  const send = (event, data) => socket?.emit(event, data);

  const currentPlayer = room?.players?.[room?.currentIdx];
  const isMyTurn = currentPlayer?.userId === user.id;
  const myPlayer = room?.players?.find(p => p.userId === user.id);
  const callAmt  = Math.max(0, (room?.currentBet || 0) - (myPlayer?.roundBet || 0));

  if (!connected) return <div className="loading"><div className="spinner" />Conectando al servidor de poker...</div>;

  if (!room) return (
    <RoomList
      rooms={rooms}
      onCreate={opts => send('room:create', { ...opts, user: { id: user.id, username: user.username } })}
      onJoin={id => send('room:join', { roomId: id, user: { id: user.id, username: user.username } })}
    />
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {msg && <div className="alert alert-error" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* Table header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: '#a78bfa' }}>♠️ {room.name}</div>
        <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 2 }}>Buy-in: {room.buyIn} · Fase: {room.phase} · Bote: <strong style={{ color: '#ffd700' }}>{room.pot?.toLocaleString()}</strong></div>
      </div>

      {/* Showdown overlay */}
      {showdown && (
        <div className="card" style={{ border: '2px solid #ffd700', background: 'rgba(255,215,0,0.05)', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: '#ffd700', marginBottom: 10 }}>
            🏆 {showdown.winner?.username} gana con {showdown.winner?.handName}!
          </div>
          {showdown.players?.map(p => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: p.userId === showdown.winner?.userId ? '#ffd700' : '#e0e0f0' }}>{p.username}</span>
              <div style={{ display: 'flex', gap: 4 }}>{p.holeCards?.map((c, i) => <Card key={i} card={c} small />)}</div>
              <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontFamily: 'Rajdhani' }}>{p.bestHand?.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Community cards */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }, (_, i) => <Card key={i} card={room.community?.[i] || null} />)}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
        {room.players?.map(p => (
          <PlayerSeat key={p.userId} player={{ ...p, holeCards: p.userId === user.id ? myCards : p.holeCards }} isMe={p.userId === user.id} isCurrent={currentPlayer?.userId === p.userId} />
        ))}
      </div>

      {/* My hole cards */}
      {myCards.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginBottom: 6, fontFamily: 'Rajdhani' }}>TU MANO</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>{myCards.map((c, i) => <Card key={i} card={c} />)}</div>
        </div>
      )}

      {/* Actions */}
      <div className="card" style={{ border: '1px solid #1e1e30', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        {room.status === 'waiting' && room.players?.length >= 2 && room.players?.find(p => p.userId === user.id) && (
          <button className="btn btn-primary" onClick={() => send('game:start', { roomId: room.id })}>
            🃏 Iniciar Partida
          </button>
        )}
        {isMyTurn && room.phase !== 'waiting' && room.phase !== 'showdown' && (
          <>
            <button className="btn btn-sm" onClick={() => send('game:action', { roomId: room.id, action: 'fold' })}
              style={{ background: 'rgba(255,68,102,0.15)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700 }}>
              Fold
            </button>
            {callAmt === 0
              ? <button className="btn btn-secondary btn-sm" onClick={() => send('game:action', { roomId: room.id, action: 'check' })}>Check</button>
              : <button className="btn btn-secondary btn-sm" onClick={() => send('game:action', { roomId: room.id, action: 'call' })}>Call ({callAmt.toLocaleString()})</button>
            }
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="input" type="number" min={room.currentBet + 1} value={raiseAmt} onChange={e => setRaiseAmt(e.target.value)}
                placeholder="Monto raise" style={{ width: 110 }} />
              <button className="btn btn-primary btn-sm" onClick={() => send('game:action', { roomId: room.id, action: 'raise', amount: raiseAmt })} disabled={!raiseAmt}>
                Raise
              </button>
            </div>
            <button onClick={() => send('game:action', { roomId: room.id, action: 'allin' })}
              style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>
              All In 🃏
            </button>
          </>
        )}
        {!isMyTurn && room.phase !== 'waiting' && room.phase !== 'showdown' && (
          <div style={{ color: '#6a6a8a', fontFamily: 'Rajdhani', fontSize: '0.9rem' }}>Turno de: {currentPlayer?.username}...</div>
        )}
        <button onClick={() => { send('room:leave', { roomId: room.id }); setRoom(null); setMyCards([]); socket.emit('rooms:list'); }}
          style={{ background: 'transparent', border: '1px solid #1e1e30', color: '#6a6a8a', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Rajdhani', marginLeft: 'auto' }}>
          Salir
        </button>
      </div>
    </div>
  );
}
