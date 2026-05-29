import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';
import AlbionAvatar from '../components/AlbionAvatar';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();
  const [myRequests, setMyRequests] = useState([]);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferMsg, setTransferMsg] = useState('');
  const [transferErr, setTransferErr] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [creditMsg, setCreditMsg] = useState('');
  const [creditErr, setCreditErr] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState(null);

  const [editChar, setEditChar] = useState(false);
  const [charNameInput, setCharNameInput] = useState('');
  const [savingChar, setSavingChar] = useState(false);
  const [charErr, setCharErr] = useState('');

  useEffect(() => {
    if (user) {
      setCharNameInput(user.albion_character || '');
      api.getMyRequests().then(d => setMyRequests(Array.isArray(d) ? d : [])).catch(() => {});
      api.getRankingsTop().then(d => setWeeklyStats(d)).catch(() => {});
      api.getTransferHistory().then(setTransferHistory).catch(() => {});
    }
  }, [user]);

  const saveCharacter = async () => {
    setSavingChar(true);
    setCharErr('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ albion_character: charNameInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      
      await refreshUser();
      setEditChar(false);
    } catch (err) {
      setCharErr(err.message);
    } finally {
      setSavingChar(false);
    }
  };

  const renderUserAvatar = (size) => {
    if (user.albion_avatar) {
      return (
        <div style={{ margin: '0 auto' }}>
          <AlbionAvatar 
            avatarId={user.albion_avatar} 
            ringId={user.albion_ring} 
            size={size} 
            characterName={user.albion_character}
          />
        </div>
      );
    }
    
    return (
      <div style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        background: 'linear-gradient(135deg, #00aacc, #0044aa)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'Rajdhani', 
        fontWeight: 700, 
        fontSize: size > 40 ? '3rem' : '1.5rem', 
        color: 'white', 
        overflow: 'hidden', 
        border: '3px solid rgba(0,212,255,0.3)', 
        margin: '0 auto', 
        boxShadow: '0 0 25px rgba(0,212,255,0.2)', 
        cursor: 'pointer' 
      }}
        onClick={() => fileRef.current.click()}>
        {user.avatar ? (
          <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          user.username[0].toUpperCase()
        )}
      </div>
    );
  };

  const requestCredit = async () => {
    setRequesting(true);
    setCreditMsg(''); setCreditErr('');
    try {
      await api.requestCredit();
      setCreditMsg('Solicitud enviada. Un admin revisará tu pedido pronto.');
      api.getMyRequests().then(setMyRequests);
    } catch (e) { setCreditErr(e.message); }
    finally { setRequesting(false); }
  };

  const hasPending = myRequests.some(r => r.status === 'pending');

  const doTransfer = async (e) => {
    e.preventDefault();
    const amt = parseInt(transferAmt);
    if (!transferTo.trim() || !amt || amt <= 0) return setTransferErr('Completá todos los campos');
    setTransferring(true); setTransferMsg(''); setTransferErr('');
    try {
      const r = await api.transferTokens({ to_username: transferTo.trim(), amount: amt, note: transferNote.trim() });
      setTransferMsg(`✅ ${amt.toLocaleString('es-AR')} tokens enviados a ${transferTo}`);
      setTransferTo(''); setTransferAmt(''); setTransferNote('');
      await refreshUser();
      api.getTransferHistory().then(setTransferHistory).catch(() => {});
    } catch (e) { setTransferErr(e.message); }
    finally { setTransferring(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await api.uploadAvatar(fd);
      await refreshUser();
      setMsg('¡Foto actualizada!');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const ROLE_COLORS = { admin: '#ff3366', officer: '#ffaa00', member: '#00d4ff' };
  const ROLE_LABELS = { admin: 'Administrador', officer: 'Officer', member: 'Miembro' };

  return (
    <div className="page">
      <div className="section-header">
        <h2>Mi Perfil</h2>
        <div className="accent-line" />
      </div>

      <div className="profile-grid">
        {/* Avatar card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            {renderUserAvatar(160)}
            {!user.albion_avatar && (
              <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#00d4ff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.8rem', zIndex: 10 }} onClick={() => fileRef.current.click()}>
                📷
              </div>
            )}
            <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
          </div>

          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: 'white', letterSpacing: '0.05em' }}>{user.username}</div>
          <div style={{ color: ROLE_COLORS[user.role], fontSize: '0.85rem', fontFamily: 'Rajdhani', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 4 }}>{ROLE_LABELS[user.role]}</div>
          {uploading && <div style={{ marginTop: 8, color: '#6a6a8a', fontSize: '0.8rem' }}>Subiendo foto...</div>}
          {msg && <div style={{ marginTop: 8, color: '#00cc66', fontSize: '0.8rem' }}>{msg}</div>}

          <div style={{ marginTop: 20, padding: '16px 0', borderTop: '1px solid #1e1e30' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#ffd700' }}>⚡ {Number(user.coins).toLocaleString('es-AR')}</div>
            <div style={{ fontSize: '0.78rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coins Disponibles</div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#4a4a6a', marginTop: 8 }}>
            Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </div>

          {/* Seccion de vinculación de Albion Online */}
          <div style={{ marginTop: 18, padding: '12px 10px', background: '#0b0b14', borderRadius: 8, border: '1px solid #1a1a2a', textAlign: 'center' }}>
            {editChar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#8a8ab0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personaje Albion</div>
                <input 
                  className="input" 
                  style={{ height: 32, fontSize: '0.85rem', textAlign: 'center', background: '#07070b' }} 
                  placeholder="Nombre de tu personaje..." 
                  value={charNameInput} 
                  onChange={e => setCharNameInput(e.target.value)} 
                />
                {charErr && <div style={{ color: '#ff3366', fontSize: '0.75rem', marginTop: 2 }}>{charErr}</div>}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ height: 26, padding: '0 12px', fontSize: '0.75rem' }} 
                    disabled={savingChar}
                    onClick={saveCharacter}
                  >
                    {savingChar ? '...' : 'Guardar'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ height: 26, padding: '0 12px', fontSize: '0.75rem' }} 
                    disabled={savingChar}
                    onClick={() => { setEditChar(false); setCharNameInput(user.albion_character || ''); setCharErr(''); }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {user.albion_character ? (
                  <>
                    <div style={{ fontSize: '0.75rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personaje Albion</div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#00d4ff' }}>
                      {user.albion_character}
                    </div>
                    <button 
                      style={{ background: 'none', border: 'none', color: '#6a6a8a', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', padding: 0, marginTop: 4 }}
                      onClick={() => setEditChar(true)}
                    >
                      Cambiar personaje
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.72rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>¿No vinculaste tu personaje?</div>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ fontSize: '0.75rem', padding: '4px 12px', borderColor: '#00d4ff33', color: '#00d4ff' }}
                      onClick={() => setEditChar(true)}
                    >
                      Vincular Personaje
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div className="card-title" style={{ margin: 0 }}>Estadísticas Semanal de Usuario</div>
              {weeklyStats && (
                <span style={{ fontSize: '0.72rem', color: '#4a4a6a' }}>📄 Datos del ranking semanal</span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              {(() => {
                const find = (arr) => (arr || []).find(p => p.name?.toLowerCase() === user.username?.toLowerCase());
                const pvpEntry   = find(weeklyStats?.byFame);
                const pveEntry   = find(weeklyStats?.byPveFame);
                const farmEntry  = find(weeklyStats?.byKills);
                const fmt = v => v != null ? Number(v).toLocaleString('es-AR') : '—';
                return [
                  { label: 'PvP Fame',   value: fmt(pvpEntry?.value),  color: '#00d4ff', icon: '⚔️',  found: !!pvpEntry },
                  { label: 'PvE Fame',   value: fmt(pveEntry?.value),  color: '#00cc66', icon: '⭐',  found: !!pveEntry },
                  { label: 'Fame Farm',  value: fmt(farmEntry?.value), color: '#cd7f32', icon: '🪵',  found: !!farmEntry },
                  { label: 'Asistencias', value: user.cta_attendance || '0', color: '#ff8844', icon: '🛡️', found: true },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0f0f18', border: `1px solid ${s.found && s.value !== '—' ? '#1e1e30' : '#1e1e30'}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: s.value === '—' ? '#3a3a5a' : s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Token Transfer */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>💸 Enviar Tokens</div>
            {transferMsg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{transferMsg}</div>}
            {transferErr && <div className="alert alert-error" style={{ marginBottom: 12 }}>{transferErr}</div>}
            <form onSubmit={doTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" placeholder="Nombre de usuario del destinatario..." value={transferTo} onChange={e => setTransferTo(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" min="1" placeholder="Cantidad de tokens..." value={transferAmt} onChange={e => setTransferAmt(e.target.value)} style={{ flex: 1 }} required />
                <button type="submit" className="btn btn-primary" disabled={transferring || !transferTo || !transferAmt}>
                  {transferring ? '...' : 'Enviar →'}
                </button>
              </div>
              <input className="input" placeholder="Motivo (opcional)..." value={transferNote} onChange={e => setTransferNote(e.target.value)} />
            </form>
            {transferHistory.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setShowHistory(h => !h)} style={{ background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Rajdhani', padding: 0 }}>
                  {showHistory ? '▲ Ocultar' : '▼ Ver historial'} ({transferHistory.length})
                </button>
                {showHistory && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {transferHistory.map(t => (
                      <div key={t.id} style={{ background: '#0f0f18', border: '1px solid #1e1e30', borderRadius: 6, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: t.amount > 0 ? '#00cc66' : '#ff4466', fontSize: '0.88rem' }}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('es-AR')}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.75rem', color: '#9090b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.reason}</span>
                        <span style={{ fontSize: '0.72rem', color: '#4a4a6a', flexShrink: 0 }}>{new Date(t.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Sistema de Reequipo</div>
            <div className="alert alert-info">
              Tus coins acumuladas: <strong style={{ color: '#ffd700' }}>⚡ {Number(user.coins).toLocaleString('es-AR')}</strong>.
              Cuando morís en Albion, entrá al Killboard → "Mis Muertes" y solicitá el reequipo directamente desde el evento.
              Un admin revisará los precios del mercado y acreditará los coins. Luego podés solicitar el canje de silver en juego.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <a href="/killboard" className="btn btn-primary btn-sm">⚔️ Ver Mis Muertes</a>
              <a href="/reequip" className="btn btn-secondary btn-sm">📋 Mis Solicitudes</a>
              {(user.coins || 0) > 0 && !hasPending && (
                <button className="btn btn-secondary btn-sm" style={{ borderColor: '#ffd700', color: '#ffd700' }} onClick={requestCredit} disabled={requesting}>
                  {requesting ? '...' : '💳 Solicitar Canje'}
                </button>
              )}
              {hasPending && <span style={{ fontSize: '0.82rem', color: '#ffaa00', alignSelf: 'center' }}>⏳ Solicitud pendiente de revisión</span>}
            </div>
            {creditMsg && <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>{creditMsg}</div>}
            {creditErr && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{creditErr}</div>}

            {myRequests.length > 0 && (
              <div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'Rajdhani', fontWeight: 600, color: '#9090b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Historial de Canjes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {myRequests.map(r => (
                    <div key={r.id} style={{ background: '#0f0f18', border: '1px solid #1e1e30', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700' }}>⚡ {Number(r.coins).toLocaleString('es-AR')}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6a6a8a' }}>{new Date(r.created_at).toLocaleDateString('es-ES')}</span>
                      <span style={{ fontSize: '0.75rem', color: r.status === 'pending' ? '#ffaa00' : r.status === 'completed' ? '#00cc66' : '#ff6688' }}>
                        {r.status === 'pending' ? '⏳ Pendiente' : r.status === 'completed' ? '✅ Entregado' : '❌ Rechazado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
