import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

function fmtDate(s) {
  return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const map = {
    open:      { label: '🟢 Abierta', color: '#00cc66' },
    locked:    { label: '🔒 Cerrada', color: '#ffaa00' },
    resolved:  { label: '✅ Resuelta', color: '#00d4ff' },
    cancelled: { label: '❌ Cancelada', color: '#ff4466' },
  };
  const s = map[status] || { label: status, color: '#6a6a8a' };
  return (
    <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: 20, background: s.color + '22', color: s.color, border: `1px solid ${s.color}44`, fontFamily: 'Rajdhani', fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function EventCard({ event, onOpen }) {
  const total = (event.options || []).reduce((s, o) => s + (event.totals?.[o.id] || 0), 0);
  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border 0.2s', border: '1px solid #1e1e30' }}
      onClick={() => onOpen(event.id)}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff44'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e30'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.15rem', color: 'white', flex: 1 }}>{event.title}</div>
        <StatusBadge status={event.status} />
      </div>
      {event.description && <p style={{ fontSize: '0.88rem', color: '#9090b0', marginBottom: 12 }}>{event.description}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(event.options || []).map(opt => (
          <div key={opt.id} style={{ padding: '5px 14px', borderRadius: 6, background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '0.85rem', fontFamily: 'Rajdhani', fontWeight: 600, color: '#e0e0f0' }}>
            {opt.label}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#4a4a6a', display: 'flex', gap: 16 }}>
        <span>💰 Bote: <strong style={{ color: '#ffd700' }}>{total.toLocaleString('es-AR')}</strong></span>
        <span>📅 {fmtDate(event.created_at)}</span>
      </div>
    </div>
  );
}

function EventModal({ eventId, onClose, onRefresh }) {
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [betAmt, setBetAmt] = useState('');
  const [selectedOpt, setSelectedOpt] = useState('');
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.getBetEvent(eventId).then(setEvent).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [eventId]);

  const placeBet = async () => {
    if (!selectedOpt || !betAmt) return setErr('Seleccioná una opción e ingresá el monto');
    setPlacing(true); setErr('');
    try {
      await api.placeBet(eventId, { option_id: selectedOpt, amount: parseInt(betAmt) });
      setMsg('✅ ¡Apuesta registrada!');
      load(); onRefresh();
    } catch (e) { setErr(e.message); }
    finally { setPlacing(false); }
  };

  const adminAction = async (action, extra = {}) => {
    try {
      await api[action](eventId, extra);
      setMsg('✅ Acción realizada');
      load(); onRefresh();
    } catch (e) { setErr(e.message); }
  };

  if (loading) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="loading"><div className="spinner" /> Cargando...</div>
      </div>
    </div>
  );

  if (!event) return null;

  const totalPot = event.totalPot || 0;
  const myBet = event.myEntry;
  const canBet = event.status === 'open' && user && !myBet;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: 'white', marginBottom: 6 }}>{event.title}</h2>
            <StatusBadge status={event.status} />
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6a6a8a', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {event.description && <p style={{ color: '#9090b0', fontSize: '0.9rem', marginBottom: 16 }}>{event.description}</p>}

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}
        {msg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{msg}</div>}

        {/* Options with bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {event.options.map(opt => {
            const optTotal = event.totals?.[opt.id] || 0;
            const pct = totalPot > 0 ? (optTotal / totalPot) * 100 : 0;
            const isWinner = event.winning_option_id === opt.id;
            const myPick = myBet?.option_id === opt.id;
            return (
              <div key={opt.id}
                onClick={() => canBet && setSelectedOpt(opt.id)}
                style={{
                  border: `2px solid ${isWinner ? '#ffd700' : myPick ? '#00cc66' : selectedOpt === opt.id ? '#00d4ff' : '#1e1e30'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: canBet ? 'pointer' : 'default',
                  background: isWinner ? 'rgba(255,215,0,0.06)' : myPick ? 'rgba(0,204,102,0.06)' : selectedOpt === opt.id ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: isWinner ? '#ffd700' : 'white' }}>
                    {isWinner ? '🏆 ' : myPick ? '✅ ' : ''}{opt.label}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                    {optTotal.toLocaleString('es-AR')} tokens · {pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 6, background: '#1a1a28', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? '#ffd700' : '#00d4ff', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, fontSize: '0.88rem', color: '#6a6a8a' }}>
          <span>💰 Bote total: <strong style={{ color: '#ffd700' }}>{totalPot.toLocaleString('es-AR')} tokens</strong></span>
          <span>👥 {(event.entries || []).length} apuestas</span>
        </div>

        {/* My bet display */}
        {myBet && (
          <div style={{ background: 'rgba(0,204,102,0.08)', border: '1px solid rgba(0,204,102,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.88rem' }}>
            <div style={{ color: '#00cc66', fontFamily: 'Rajdhani', fontWeight: 700 }}>Tu apuesta:</div>
            <div style={{ color: '#e0e0f0', marginTop: 4 }}>
              {event.options.find(o => o.id === myBet.option_id)?.label} — <strong>{myBet.amount.toLocaleString('es-AR')} tokens</strong>
              {myBet.won !== null && myBet.won !== undefined && (
                <span style={{ marginLeft: 10, color: myBet.won ? '#ffd700' : '#ff4466' }}>
                  {myBet.won ? `🏆 Ganaste ${myBet.payout?.toLocaleString('es-AR')} tokens` : '❌ Perdiste'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Place bet form */}
        {canBet && (
          <div style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid #1e1e30', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#00d4ff', marginBottom: 10 }}>
              Apostá tus tokens
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input" type="number" min="1" placeholder="Cantidad de tokens..."
                value={betAmt} onChange={e => setBetAmt(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={placeBet} disabled={placing || !selectedOpt}>
                {placing ? '...' : '🎲 Apostar'}
              </button>
            </div>
            {selectedOpt && <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#6a6a8a' }}>
              Apostando a: <strong style={{ color: '#e0e0f0' }}>{event.options.find(o => o.id === selectedOpt)?.label}</strong>
            </div>}
          </div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #1e1e30' }}>
            {event.status === 'open' && (
              <button className="btn btn-secondary btn-sm" onClick={() => adminAction('lockBets')}>🔒 Cerrar apuestas</button>
            )}
            {event.status !== 'resolved' && event.status !== 'cancelled' && (
              <>
                {event.options.map(opt => (
                  <button key={opt.id} className="btn btn-sm" onClick={() => adminAction('resolveBet', { winning_option_id: opt.id })}
                    style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem' }}>
                    🏆 Ganó: {opt.label}
                  </button>
                ))}
                <button className="btn btn-sm" onClick={() => adminAction('cancelBet')}
                  style={{ background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem' }}>
                  ❌ Cancelar (reembolsar)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const validOpts = opts.filter(o => o.trim());
    if (!title.trim() || validOpts.length < 2) return setErr('Título y al menos 2 opciones requeridas');
    setLoading(true); setErr('');
    try {
      await api.createBetEvent({ title: title.trim(), description: desc.trim() || null, options: validOpts });
      setTitle(''); setDesc(''); setOpts(['', '']);
      onCreated();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ border: '1px solid rgba(0,212,255,0.2)' }}>
      <div className="card-title" style={{ marginBottom: 16 }}>➕ Crear Apuesta</div>
      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="input" placeholder="Título (ej: Argentina vs Brasil)" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea className="input" placeholder="Descripción opcional..." value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', color: '#9090b0', marginBottom: 8 }}>Opciones</div>
          {opts.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input className="input" placeholder={`Opción ${i + 1}`} value={o} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }} style={{ flex: 1 }} />
              {opts.length > 2 && <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} style={{ background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.4)', color: '#ff4466', borderRadius: 6, padding: '0 10px', cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          {opts.length < 6 && (
            <button type="button" onClick={() => setOpts([...opts, ''])} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>+ Agregar opción</button>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : '🎲 Crear Apuesta'}</button>
      </form>
    </div>
  );
}

export default function Apuestas() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('active');

  const load = () => {
    api.getBetEvents().then(setEvents).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => {
    if (filter === 'active') return e.status === 'open' || e.status === 'locked';
    if (filter === 'resolved') return e.status === 'resolved';
    if (filter === 'all') return true;
    return true;
  });

  return (
    <div className="page">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: 'white', letterSpacing: '0.08em' }}>
          🎲 Apuestas
        </h1>
        <div className="accent-line" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 380px' : '1fr', gap: 24 }}>
        <div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[['active','🟢 Activas'],['resolved','✅ Resueltas'],['all','📋 Todas']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem',
                border: `1px solid ${filter === v ? '#00d4ff66' : '#1e1e30'}`,
                background: filter === v ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: filter === v ? '#00d4ff' : '#6a6a8a',
              }}>{l}</button>
            ))}
          </div>

          {loading && <div className="loading"><div className="spinner" />Cargando...</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty"><div className="empty-icon">🎲</div><p>No hay apuestas</p></div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(e => (
              <EventCard key={e.id} event={e} onOpen={setSelectedId} />
            ))}
          </div>
        </div>

        {isAdmin && <CreateEventForm onCreated={load} />}
      </div>

      {selectedId && (
        <EventModal eventId={selectedId} onClose={() => setSelectedId(null)} onRefresh={load} />
      )}
    </div>
  );
}
