import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import AlbionStatsTab from './AlbionStatsTab';

function formatDate(str) {
  return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ROLE_LABELS = { admin: 'Admin', officer: 'Officer', member: 'Miembro' };
const ROLE_BADGES = { admin: 'badge-admin', officer: 'badge-officer', member: 'badge-member' };

function StatCard({ label, value, color = '#00d4ff', icon }) {
  return (
    <div className="card stat-box">
      <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Admin() {
  const { user: authUser } = useAuth();
  const isStrictAdmin = authUser?.role === 'admin';
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [news, setNews] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [creditRequests, setCreditRequests] = useState([]);
  const [giveawayForm, setGiveawayForm] = useState({ title: '', prizes: '', duration: 60 });
  const [currentGiveaway, setCurrentGiveaway] = useState(null);
  const [weeklyPrize, setWeeklyPrize] = useState(null);
  const [banners, setBanners] = useState([]);
  const [bannerCaption, setBannerCaption] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const bannerFileRef = React.useRef();
  const [rankingsFile, setRankingsFile] = useState(null);
  const [rankingsType, setRankingsType] = useState('pvp_fame');
  const [rankingsInfo, setRankingsInfo] = useState(null);
  const rankingsFileRef = React.useRef();
  const weeklyPrizeFileRef = React.useRef();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [blacklistForm, setBlacklistForm] = useState({ username: '', reason: '' });
  const [creditFilter, setCreditFilter] = useState('pending');
  const [creditNotes, setCreditNotes] = useState({});

  // Forms
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'general', pinned: false });
  const [editingNews, setEditingNews] = useState(null);
  const [activityForm, setActivityForm] = useState({ name: '', type: 'CTA', date: '', description: '' });
  const [coinAdjust, setCoinAdjust] = useState({ user_id: '', amount: 0, reason: '' });
  const [coinMode, setCoinMode] = useState('add');
  const [coinSearch, setCoinSearch] = useState('');
  const [coinDropOpen, setCoinDropOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'member' });
  const [statsEdit, setStatsEdit] = useState({ user_id: '', pvp_fame: '', pvp_kills: '', cta_attendance: '', total_activities: '' });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingBuilds, setPendingBuilds] = useState([]);
  const [editingUsername, setEditingUsername] = useState({}); // { [id]: newName }
  const [resetPw, setResetPw] = useState({}); // { [id]: draftPassword }

  const notify = (ok, msg) => { if (ok) setMsg(msg); else setErr(msg); setTimeout(() => { setMsg(''); setErr(''); }, 4000); };

  const loadAll = () => {
    api.getAdminStats().then(setStats);
    api.getMembers().then(setMembers);
    api.getNews().then(setNews);
    api.getTransactions().then(setTransactions);
    api.getActivities().then(setActivities);
    api.getBlacklist().then(setBlacklist);
    api.getCreditRequests(creditFilter).then(setCreditRequests);
    api.getCurrentGiveaway().then(setCurrentGiveaway).catch(() => {});
    api.getWeeklyPrize().then(setWeeklyPrize).catch(() => {});
    api.getBanners().then(b => setBanners(Array.isArray(b) ? b : [])).catch(() => {});
    api.getRankingsTop().then(setRankingsInfo).catch(() => {});
    api.getPendingUsers().then(setPendingUsers).catch(() => {});
    api.getPendingBuilds().then(setPendingBuilds).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const saveNews = async () => {
    try {
      if (editingNews) { await api.updateNews(editingNews.id, newsForm); setEditingNews(null); }
      else await api.createNews(newsForm);
      setNewsForm({ title: '', content: '', category: 'general', pinned: false });
      loadAll(); notify(true, 'Noticia guardada');
    } catch (e) { notify(false, e.message); }
  };

  const deleteNews = async (id) => {
    if (!confirm('¿Eliminar esta noticia?')) return;
    await api.deleteNews(id); loadAll(); notify(true, 'Noticia eliminada');
  };

  const saveActivity = async () => {
    try {
      await api.createActivity(activityForm);
      setActivityForm({ name: '', type: 'CTA', date: '', description: '' });
      loadAll(); notify(true, 'Actividad creada');
    } catch (e) { notify(false, e.message); }
  };

  const adjustCoins = async () => {
    const finalAmount = coinMode === 'subtract' ? -Math.abs(coinAdjust.amount) : Math.abs(coinAdjust.amount);
    try {
      await api.adjustCoins({ ...coinAdjust, amount: finalAmount });
      setCoinAdjust({ user_id: '', amount: 0, reason: '' });
      setCoinMode('add');
      loadAll(); notify(true, 'Coins ajustadas');
    } catch (e) { notify(false, e.message); }
  };

  const createUser = async () => {
    if (!newUserForm.username.trim() || !newUserForm.password.trim()) return notify(false, 'Completá usuario y contraseña');
    try {
      await api.createUser(newUserForm);
      setNewUserForm({ username: '', password: '', role: 'member' });
      loadAll(); notify(true, `Usuario "${newUserForm.username}" creado`);
    } catch (e) { notify(false, e.message); }
  };

  const updateStats = async () => {
    const { user_id, ...rest } = statsEdit;
    if (!user_id) return notify(false, 'Selecciona un jugador');
    const body = {};
    if (rest.pvp_fame !== '') body.pvp_fame = parseInt(rest.pvp_fame);
    if (rest.pvp_kills !== '') body.pvp_kills = parseInt(rest.pvp_kills);
    if (rest.cta_attendance !== '') body.cta_attendance = parseInt(rest.cta_attendance);
    if (rest.total_activities !== '') body.total_activities = parseInt(rest.total_activities);
    try {
      await api.updateStats(user_id, body);
      loadAll(); notify(true, 'Stats actualizadas');
    } catch (e) { notify(false, e.message); }
  };

  const updateRole = async (userId, role) => {
    try { await api.updateRole(userId, role); loadAll(); notify(true, 'Rol actualizado'); }
    catch (e) { notify(false, e.message); }
  };

  const addBlacklist = async () => {
    if (!blacklistForm.username.trim()) return notify(false, 'Ingresa un nombre de jugador');
    try {
      await api.addToBlacklist(blacklistForm);
      setBlacklistForm({ username: '', reason: '' });
      api.getBlacklist().then(setBlacklist);
      notify(true, 'Jugador agregado a blacklist');
    } catch (e) { notify(false, e.message); }
  };

  const removeBlacklist = async (id) => {
    if (!confirm('¿Quitar de blacklist?')) return;
    await api.removeFromBlacklist(id);
    api.getBlacklist().then(setBlacklist);
    notify(true, 'Jugador removido de blacklist');
  };

  const loadCreditRequests = (status) => {
    api.getCreditRequests(status).then(setCreditRequests);
  };

  const approveCredit = async (id) => {
    try {
      await api.completeCredit(id, { admin_notes: creditNotes[id] || '' });
      loadCreditRequests(creditFilter);
      api.getAdminStats().then(setStats);
      notify(true, 'Crédito entregado y coins deducidas');
    } catch (e) { notify(false, e.message); }
  };

  const rejectCredit = async (id) => {
    try {
      await api.rejectCredit(id, { admin_notes: creditNotes[id] || '' });
      loadCreditRequests(creditFilter);
      notify(true, 'Solicitud rechazada');
    } catch (e) { notify(false, e.message); }
  };

  const createGiveaway = async () => {
    if (!giveawayForm.title || !giveawayForm.prizes) return notify(false, 'Completá título y premios');
    const prizes = giveawayForm.prizes.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      await api.createGiveaway({ title: giveawayForm.title, prizes, duration: parseInt(giveawayForm.duration) || 60 });
      setGiveawayForm({ title: '', prizes: '', duration: 60 });
      api.getCurrentGiveaway().then(setCurrentGiveaway);
      notify(true, 'Sorteo creado');
    } catch (e) { notify(false, e.message); }
  };

  const uploadRankings = async () => {
    if (!rankingsFile) return notify(false, 'Seleccioná un archivo');
    const fd = new FormData();
    fd.append('file', rankingsFile);
    fd.append('type', rankingsType);
    try {
      const r = await api.uploadRankings(fd);
      const label = { pvp_fame: 'PvP Fame', kills: 'Kills', pve_fame: 'PvE Fame' }[r.type];
      notify(true, `Rankings de ${label} cargados: ${r.count} jugadores`);
      setRankingsFile(null); rankingsFileRef.current.value = '';
      api.getRankingsTop().then(setRankingsInfo);
    } catch (e) { notify(false, e.message); }
  };

  const uploadWeeklyPrize = async (file) => {
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await api.uploadWeeklyPrize(fd);
      setWeeklyPrize(r); notify(true, 'Imagen subida');
    } catch (e) { notify(false, e.message); }
  };

  const approveUser = async (id, role) => {
    try { await api.approveUser(id, role); loadAll(); notify(true, 'Usuario aprobado'); }
    catch (e) { notify(false, e.message); }
  };

  const rejectUser = async (id, username) => {
    if (!confirm(`¿Rechazar y eliminar la cuenta de "${username}"?`)) return;
    try { await api.rejectUser(id); loadAll(); notify(true, 'Usuario rechazado y eliminado'); }
    catch (e) { notify(false, e.message); }
  };

  const saveUsername = async (id) => {
    const newName = editingUsername[id];
    if (!newName || !newName.trim()) return;
    try {
      await api.editUsername(id, newName.trim());
      setEditingUsername(p => { const n = { ...p }; delete n[id]; return n; });
      loadAll(); notify(true, 'Nombre actualizado');
    } catch (e) { notify(false, e.message); }
  };

  const pendingCredits = creditRequests.filter(r => r.status === 'pending').length;

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'pending', label: pendingUsers.length > 0 ? `⏳ Pendientes (${pendingUsers.length})` : '⏳ Pendientes' },
    { id: 'builds-pending', label: pendingBuilds.length > 0 ? `⚔️ Builds (${pendingBuilds.length})` : '⚔️ Builds' },
    { id: 'news', label: '📰 Noticias' },
    { id: 'members', label: '👥 Miembros' },
    ...(isStrictAdmin ? [{ id: 'coins', label: '💰 Coins' }] : []),
    { id: 'blacklist', label: '🚫 Blacklist' },
    { id: 'credits', label: creditFilter === 'pending' && pendingCredits > 0 ? `💳 Créditos (${pendingCredits})` : '💳 Créditos' },
    { id: 'rankings', label: '📄 Rankings TXT' },
    { id: 'giveaway', label: '🎰 Sorteos' },
    { id: 'media', label: '🖼️ Premios Semanales' },
    { id: 'banners', label: '🎨 Slideshow' },
    { id: 'albion-stats', label: '📈 Stats Albion' },
  ];

  return (
    <div className="page">
      <div className="section-header">
        <h2>Panel de Administración</h2>
        <div className="accent-line" />
      </div>

      {(msg || err) && (
        <div className={`alert ${msg ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {msg || err}
        </div>
      )}

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard label="Miembros" value={stats.totalMembers} icon="👥" />
            <StatCard label="Reportes Pendientes" value={stats.pendingReports} color="#ffaa00" icon="⏳" />
            <StatCard label="Noticias" value={stats.totalNews} icon="📰" />
            <StatCard label="Builds" value={stats.totalBuilds} icon="⚔️" />
            <StatCard label="Coins Entregadas" value={stats.totalCoinsAwarded} color="#ffd700" icon="⚡" />
          </div>
        </div>
      )}

      {/* Pending Users */}
      {tab === 'pending' && (
        <div>
          <div className="section-header"><h2>Usuarios Pendientes</h2><div className="accent-line" /></div>
          {pendingUsers.length === 0 ? (
            <div className="empty"><div className="empty-icon">✅</div><p>No hay usuarios pendientes de aprobación</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingUsers.map(u => (
                <div key={u.id} className="card" style={{ border: '1px solid rgba(255,170,0,0.3)', background: 'rgba(255,170,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#ffaa00', flex: 1 }}>
                      ⏳ {u.username}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>Registrado: {formatDate(u.created_at)}</div>
                  </div>

                  {/* Editar nombre */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 160 }}
                      placeholder={`Nombre actual: ${u.username}`}
                      value={editingUsername[u.id] ?? ''}
                      onChange={e => setEditingUsername(p => ({ ...p, [u.id]: e.target.value }))}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={() => saveUsername(u.id)} disabled={!editingUsername[u.id]?.trim()}>
                      ✏️ Cambiar nombre
                    </button>
                  </div>

                  {/* Aprobar / Rechazar */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => approveUser(u.id, 'member')}>✅ Miembro</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => approveUser(u.id, 'officer')} style={{ borderColor: '#ffaa00', color: '#ffaa00' }}>⭐ Officer</button>
                    {isStrictAdmin && <button className="btn btn-secondary btn-sm" onClick={() => approveUser(u.id, 'admin')} style={{ borderColor: '#ff3366', color: '#ff3366' }}>🔴 Admin</button>}
                    <button className="btn btn-danger btn-sm" onClick={() => rejectUser(u.id, u.username)}>🗑 Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* News Management */}
      {tab === 'news' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">{editingNews ? 'Editar Noticia' : 'Nueva Noticia'}</div>
            <div className="form-group"><label>Título</label><input className="input" value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="form-group">
              <label>Categoría</label>
              <select className="select" value={newsForm.category} onChange={e => setNewsForm(p => ({ ...p, category: e.target.value }))}>
                <option value="general">General</option>
                <option value="announcement">Anuncio</option>
                <option value="event">Evento</option>
                <option value="war">Guerra</option>
              </select>
            </div>
            <div className="form-group"><label>Contenido</label><textarea className="textarea" value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} rows={6} /></div>
            <div className="form-group"><label>URL de Imagen (opcional)</label><input className="input" value={newsForm.image_url || ''} onChange={e => setNewsForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: '0.9rem', color: '#9090b0' }}>
              <input type="checkbox" checked={newsForm.pinned} onChange={e => setNewsForm(p => ({ ...p, pinned: e.target.checked }))} />
              📌 Fijar noticia
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {editingNews && <button className="btn btn-secondary btn-sm" onClick={() => { setEditingNews(null); setNewsForm({ title: '', content: '', category: 'general', pinned: false }); }}>Cancelar</button>}
              <button className="btn btn-primary" onClick={saveNews}>Guardar</button>
            </div>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>Noticias Existentes</div>
            {news.map(n => (
              <div key={n.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <strong style={{ fontFamily: 'Rajdhani', fontSize: '1rem' }}>{n.title}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 2 }}>{n.category} · {new Date(n.created_at).toLocaleDateString('es-ES')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => { setEditingNews(n); setNewsForm({ title: n.title, content: n.content, category: n.category, pinned: n.pinned === 1, image_url: n.image_url || '' }); }}>✏️</button>
                    <button className="btn-icon" style={{ borderColor: '#ff335544', color: '#ff6688' }} onClick={() => deleteNews(n.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Management */}
      {tab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Create user */}
          <div className="card">
            <div className="card-title">➕ Crear Usuario</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Nombre de usuario</label>
                <input className="input" value={newUserForm.username} onChange={e => setNewUserForm(p => ({ ...p, username: e.target.value }))} placeholder="Nombre en Albion" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Contraseña</label>
                <input type="password" className="input" value={newUserForm.password} onChange={e => setNewUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Mín. 6 caracteres" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Rol</label>
                <select className="select" value={newUserForm.role} onChange={e => setNewUserForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="member">Miembro</option>
                  <option value="officer">Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ height: 40 }} onClick={createUser}>Crear</button>
            </div>
          </div>

          {/* Stats editor */}
          <div className="card">
            <div className="card-title">Actualizar Stats de Jugador</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Jugador</label>
                <select className="select" value={statsEdit.user_id} onChange={e => setStatsEdit(p => ({ ...p, user_id: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
              </div>
              {[['pvp_fame', 'PvP Fame'], ['pvp_kills', 'PvP Kills'], ['cta_attendance', 'CTAs'], ['total_activities', 'Actividades']].map(([k, l]) => (
                <div key={k} className="form-group" style={{ margin: 0 }}>
                  <label>{l}</label>
                  <input type="number" className="input" value={statsEdit[k]} onChange={e => setStatsEdit(p => ({ ...p, [k]: e.target.value }))} min="0" />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={updateStats}>Actualizar</button>
              </div>
            </div>
          </div>

          {/* Members table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Rol</th>
                  <th>PvP Fame</th>
                  <th>Kills</th>
                  <th>CTAs</th>
                  <th>Coins</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00aacc, #0044aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', overflow: 'hidden', fontSize: '0.75rem', flexShrink: 0 }}>
                          {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.username[0].toUpperCase()}
                        </div>
                        {m.username}
                      </div>
                    </td>
                    <td>
                      <select className="select" style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }} value={m.role} onChange={e => updateRole(m.id, e.target.value)}>
                        <option value="member">Miembro</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ fontFamily: 'Rajdhani', color: '#00d4ff' }}>{m.pvp_fame?.toLocaleString()}</td>
                    <td style={{ fontFamily: 'Rajdhani', color: '#ff6688' }}>{m.pvp_kills}</td>
                    <td style={{ fontFamily: 'Rajdhani', color: '#ff8844' }}>{m.cta_attendance}</td>
                    <td style={{ fontFamily: 'Rajdhani', color: '#ffd700' }}>⚡ {Number(m.coins).toLocaleString('es-AR')}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {isStrictAdmin && (
                          resetPw[m.id] !== undefined ? (
                            <>
                              <input
                                autoFocus
                                className="input"
                                style={{ width: 130, padding: '3px 8px', fontSize: '0.8rem' }}
                                placeholder="Nueva contraseña"
                                value={resetPw[m.id]}
                                onChange={e => setResetPw(p => ({ ...p, [m.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Escape' && setResetPw(p => { const n = { ...p }; delete n[m.id]; return n; })}
                              />
                              <button className="btn btn-primary btn-sm" onClick={async () => {
                                if (!resetPw[m.id]?.trim()) return;
                                try {
                                  await api.resetUserPassword(m.id, resetPw[m.id].trim());
                                  setResetPw(p => { const n = { ...p }; delete n[m.id]; return n; });
                                  notify(true, `✅ Password de "${m.username}" actualizado`);
                                } catch (e) { notify(false, e.message); }
                              }}>OK</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setResetPw(p => { const n = { ...p }; delete n[m.id]; return n; })}>✕</button>
                            </>
                          ) : (
                            <button className="btn-icon" title="Resetear contraseña" style={{ borderColor: '#ffaa0044', color: '#ffaa00' }}
                              onClick={() => setResetPw(p => ({ ...p, [m.id]: '' }))}>🔑</button>
                          )
                        )}
                        {isStrictAdmin && <button className="btn-icon" style={{ borderColor: '#ff335544', color: '#ff6688' }} onClick={async () => { if (confirm(`¿Eliminar a ${m.username}?`)) { await api.deleteUser(m.id); loadAll(); } }}>🗑️</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activities */}
      {tab === 'activities' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">Crear Actividad</div>
            <div className="form-group"><label>Nombre</label><input className="input" value={activityForm.name} onChange={e => setActivityForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: CTA Zona Roja" /></div>
            <div className="form-group">
              <label>Tipo</label>
              <select className="select" value={activityForm.type} onChange={e => setActivityForm(p => ({ ...p, type: e.target.value }))}>
                <option>CTA</option><option>AVALON</option><option>DUNGEON</option><option>ZVZ</option><option>OTHER</option>
              </select>
            </div>
            <div className="form-group"><label>Fecha y Hora</label><input type="datetime-local" className="input" value={activityForm.date} onChange={e => setActivityForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="form-group"><label>Descripción</label><textarea className="textarea" value={activityForm.description} onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <button className="btn btn-primary" onClick={saveActivity}>Crear Actividad</button>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>Actividades Recientes</div>
            {activities.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontFamily: 'Rajdhani', fontSize: '1rem' }}>{a.name}</strong>
                      <span className={`badge ${a.type === 'CTA' ? 'badge-cta' : a.type === 'AVALON' ? 'badge-avalon' : 'badge-member'}`}>{a.type}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>{new Date(a.date).toLocaleString('es-ES')} · {a.attendee_count} asistentes</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginBottom: 6 }}>Marcar asistencia:</div>
                    <select className="select" style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }} onChange={async e => {
                      if (!e.target.value) return;
                      await api.markAttendance(a.id, [parseInt(e.target.value)]);
                      loadAll(); notify(true, 'Asistencia marcada');
                      e.target.value = '';
                    }}>
                      <option value="">+ Agregar jugador</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blacklist */}
      {tab === 'blacklist' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">Agregar a Blacklist</div>
            <div className="form-group"><label>Nombre del Jugador</label><input className="input" value={blacklistForm.username} onChange={e => setBlacklistForm(p => ({ ...p, username: e.target.value }))} placeholder="Nombre exacto en Albion" /></div>
            <div className="form-group"><label>Motivo</label><textarea className="textarea" rows={3} value={blacklistForm.reason} onChange={e => setBlacklistForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ej: Traidor, scammer, tóxico..." /></div>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #cc1133, #880022)', borderColor: '#ff3355' }} onClick={addBlacklist}>🚫 Agregar a Blacklist</button>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>Jugadores en Blacklist ({blacklist.length})</div>
            {blacklist.length === 0 && <div className="empty"><div className="empty-icon">✅</div><p>Sin jugadores en blacklist</p></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {blacklist.map(b => (
                <div key={b.id} className="card" style={{ padding: '14px 18px', borderColor: '#ff335533', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ff6688' }}>🚫 {b.username}</div>
                    {b.reason && <div style={{ fontSize: '0.82rem', color: '#9090b0', marginTop: 4 }}>{b.reason}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginTop: 4 }}>Agregado: {formatDate(b.created_at)} por {b.added_by_name}</div>
                  </div>
                  <button className="btn-icon" style={{ borderColor: '#ff335544', color: '#ff6688', flexShrink: 0 }} onClick={() => removeBlacklist(b.id)}>🗑️ Quitar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credits */}
      {tab === 'credits' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['pending', 'completed', 'rejected'].map(s => (
              <button key={s} className={`tab ${creditFilter === s ? 'active' : ''}`} onClick={() => { setCreditFilter(s); api.getCreditRequests(s).then(setCreditRequests); }}>
                {s === 'pending' ? '⏳ Pendientes' : s === 'completed' ? '✅ Completadas' : '❌ Rechazadas'}
              </button>
            ))}
          </div>

          {creditRequests.length === 0 && <div className="empty"><div className="empty-icon">💳</div><p>Sin solicitudes {creditFilter === 'pending' ? 'pendientes' : creditFilter === 'completed' ? 'completadas' : 'rechazadas'}</p></div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {creditRequests.map(r => (
              <div key={r.id} className="card" style={{ padding: '16px 20px', borderColor: r.status === 'pending' ? '#ffaa0033' : r.status === 'completed' ? '#00cc6633' : '#ff335533' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem' }}>
                      {r.username}
                      <span style={{ marginLeft: 10, fontFamily: 'Rajdhani', fontSize: '1.2rem', color: '#ffd700' }}>⚡ {Number(r.coins).toLocaleString('es-AR')} coins</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 4 }}>Solicitado: {formatDate(r.created_at)}</div>
                    {r.admin_notes && <div style={{ fontSize: '0.82rem', color: '#9090b0', marginTop: 6 }}>Nota: {r.admin_notes}</div>}
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: 'column' }}>
                      <input
                        className="input"
                        placeholder="Nota (opcional)"
                        value={creditNotes[r.id] || ''}
                        onChange={e => setCreditNotes(p => ({ ...p, [r.id]: e.target.value }))}
                        style={{ fontSize: '0.82rem', padding: '6px 10px', width: 200 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #00aa44, #006622)', borderColor: '#00cc66' }} onClick={() => approveCredit(r.id)}>✅ Entregar</button>
                        <button className="btn btn-secondary btn-sm" style={{ borderColor: '#ff3355', color: '#ff6688' }} onClick={() => rejectCredit(r.id)}>❌ Rechazar</button>
                      </div>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <span className={`badge ${r.status === 'completed' ? 'badge-pvp' : 'badge-cta'}`} style={{ background: r.status === 'completed' ? 'rgba(0,204,102,0.15)' : 'rgba(255,51,85,0.15)', color: r.status === 'completed' ? '#00cc66' : '#ff6688', border: `1px solid ${r.status === 'completed' ? '#00cc6644' : '#ff335544'}` }}>
                      {r.status === 'completed' ? '✅ Entregado' : '❌ Rechazado'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coins */}
      {tab === 'coins' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">Ajuste Manual de Coins</div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Jugador</label>
              <input
                className="input"
                placeholder="Buscar jugador..."
                value={coinSearch}
                onChange={e => { setCoinSearch(e.target.value); setCoinDropOpen(true); if (!e.target.value) setCoinAdjust(p => ({ ...p, user_id: '' })); }}
                onFocus={() => setCoinDropOpen(true)}
                onBlur={() => setTimeout(() => setCoinDropOpen(false), 150)}
                style={{ borderColor: coinAdjust.user_id ? '#00cc6666' : undefined }}
              />
              {coinAdjust.user_id && !coinDropOpen && (
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#00cc66' }}>
                  ✓ {members.find(m => m.id === coinAdjust.user_id)?.username} — ⚡ {Number(members.find(m => m.id === coinAdjust.user_id)?.coins).toLocaleString('es-AR')} coins
                </div>
              )}
              {coinDropOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#13131f', border: '1px solid #1e1e30', borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {members.filter(m => m.username.toLowerCase().includes(coinSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '10px 14px', color: '#4a4a6a', fontSize: '0.85rem' }}>Sin resultados</div>
                  )}
                  {members.filter(m => m.username.toLowerCase().includes(coinSearch.toLowerCase())).map(m => (
                    <div key={m.id}
                      onMouseDown={() => { setCoinAdjust(p => ({ ...p, user_id: m.id })); setCoinSearch(m.username); setCoinDropOpen(false); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e1e2a', background: coinAdjust.user_id === m.id ? 'rgba(0,212,255,0.08)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = coinAdjust.user_id === m.id ? 'rgba(0,212,255,0.08)' : 'transparent'}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.username}</span>
                      <span style={{ fontSize: '0.8rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>⚡ {Number(m.coins).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Operación</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setCoinMode('add')}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `2px solid ${coinMode === 'add' ? '#00cc66' : '#1e1e30'}`, background: coinMode === 'add' ? 'rgba(0,204,102,0.12)' : 'transparent', color: coinMode === 'add' ? '#00cc66' : '#6a6a8a', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  ＋ AGREGAR
                </button>
                <button
                  type="button"
                  onClick={() => setCoinMode('subtract')}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `2px solid ${coinMode === 'subtract' ? '#ff3355' : '#1e1e30'}`, background: coinMode === 'subtract' ? 'rgba(255,51,85,0.12)' : 'transparent', color: coinMode === 'subtract' ? '#ff3355' : '#6a6a8a', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  － RESTAR
                </button>
              </div>
              <input
                type="number"
                className="input"
                min="0"
                value={coinAdjust.amount || ''}
                placeholder="0"
                onChange={e => setCoinAdjust(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
                style={{ borderColor: coinMode === 'subtract' ? '#ff335566' : '#00cc6666' }}
              />
              {coinAdjust.amount > 0 && (
                <div style={{ marginTop: 6, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: coinMode === 'add' ? '#00cc66' : '#ff3355' }}>
                  {coinMode === 'add' ? `+${Number(coinAdjust.amount).toLocaleString('es-AR')} ⚡ coins` : `-${Number(coinAdjust.amount).toLocaleString('es-AR')} ⚡ coins`}
                </div>
              )}
            </div>
            <div className="form-group"><label>Razón</label><input className="input" value={coinAdjust.reason} onChange={e => setCoinAdjust(p => ({ ...p, reason: e.target.value }))} placeholder="Ej: Bonus actividad especial" /></div>
            <button
              className="btn btn-primary"
              onClick={adjustCoins}
              style={coinMode === 'subtract' ? { background: 'linear-gradient(135deg, #cc1133, #880022)', borderColor: '#ff3355' } : {}}
            >
              {coinMode === 'subtract' ? '－ Restar Coins' : '＋ Agregar Coins'}
            </button>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>Historial de Transacciones</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Jugador</th><th>Monto</th><th>Tipo</th><th>Razón</th></tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>{new Date(t.created_at).toLocaleDateString('es-ES')}</td>
                      <td style={{ fontWeight: 600 }}>{t.username}</td>
                      <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: t.amount >= 0 ? '#00cc66' : '#ff3355' }}>{t.amount >= 0 ? '+' : ''}{Number(t.amount).toLocaleString('es-AR')} ⚡</td>
                      <td><span className="badge badge-member">{t.type}</span></td>
                      <td style={{ fontSize: '0.82rem', color: '#9090b0' }}>{t.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rankings TXT */}
      {tab === 'rankings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">📄 Subir Rankings desde TXT</div>
            <div style={{ fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 14 }}>
              Exportá las stats del gremio desde Albion Online. El archivo debe tener columnas <strong style={{color:'#00d4ff'}}>"Jugador"</strong> y <strong style={{color:'#00d4ff'}}>"Cantidad"</strong>.
              Cada ranking se sube por separado — elegí cuál querés actualizar.
            </div>
            <div className="form-group">
              <label>¿Qué ranking es este archivo?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { val: 'pvp_fame',  icon: '⚔️', label: 'PvP Semanal' },
                  { val: 'kills',    icon: '🎒', label: 'Recolección Semanal' },
                  { val: 'pve_fame', icon: '🌿', label: 'Fama Semanal' },
                ].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setRankingsType(opt.val)}
                    style={{ padding: '8px 4px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s',
                      border: `2px solid ${rankingsType === opt.val ? '#00d4ff' : '#1e1e30'}`,
                      background: rankingsType === opt.val ? 'rgba(0,212,255,0.12)' : 'transparent',
                      color: rankingsType === opt.val ? '#00d4ff' : '#6a6a8a' }}>
                    {opt.icon}<br/>{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Archivo TXT / CSV / TSV</label>
              <input type="file" accept=".txt,.csv,.tsv" ref={rankingsFileRef} className="input" style={{ padding: '8px' }}
                onChange={e => setRankingsFile(e.target.files[0])} />
            </div>
            {rankingsFile && <div style={{ fontSize: '0.82rem', color: '#00d4ff', marginBottom: 10 }}>📎 {rankingsFile.name}</div>}
            <button className="btn btn-primary" onClick={uploadRankings}>⬆️ Cargar {rankingsType === 'pvp_fame' ? 'PvP Semanal' : rankingsType === 'kills' ? 'Recolección' : 'Fama Semanal'}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card-title">Rankings cargados</div>
            {!rankingsInfo && <div className="empty"><div className="empty-icon">📄</div><p>Sin datos cargados aún</p></div>}
            {rankingsInfo && [
              { title: '⚔️ Top PvP Semanal',   data: rankingsInfo.byFame,    updated: rankingsInfo.updated?.pvp_fame },
              { title: '🎒 Top Recolección Semanal', data: rankingsInfo.byKills, updated: rankingsInfo.updated?.kills },
              { title: '🌿 Top Fama Semanal', data: rankingsInfo.byPveFame, updated: rankingsInfo.updated?.pve_fame },
            ].map(({ title, data, updated }) => (
              <div key={title} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#00d4ff' }}>{title}</div>
                  {updated ? <span style={{ fontSize: '0.72rem', color: '#4a4a6a' }}>Actualizado: {formatDate(updated)}</span>
                           : <span style={{ fontSize: '0.72rem', color: '#ff666688' }}>Sin datos</span>}
                </div>
                {(!data || data.length === 0) && <div style={{ color: '#4a4a6a', fontSize: '0.82rem' }}>— Sin datos cargados —</div>}
                {data?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < data.length - 1 ? '1px solid #1e1e30' : 'none' }}>
                    <span style={{ fontFamily: 'Rajdhani', fontWeight: 600 }}>{['🥇','🥈','🥉'][i]} {p.name}</span>
                    <span style={{ color: '#00d4ff', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem' }}>
                      {p.value?.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Giveaway */}
      {tab === 'giveaway' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">🎰 Crear Sorteo</div>
            <div className="form-group">
              <label>Título del sorteo</label>
              <input className="input" value={giveawayForm.title} onChange={e => setGiveawayForm(p => ({ ...p, title: e.target.value }))} placeholder="Ej: Giveaway Semanal" />
            </div>
            <div className="form-group">
              <label>Premios (uno por línea)</label>
              <textarea className="textarea" rows={4} value={giveawayForm.prizes} onChange={e => setGiveawayForm(p => ({ ...p, prizes: e.target.value }))} placeholder={"100M Silver\n50M Silver\nSet T8"} />
            </div>
            <div className="form-group">
              <label>Duración (segundos)</label>
              <input type="number" className="input" min="10" value={giveawayForm.duration} onChange={e => setGiveawayForm(p => ({ ...p, duration: e.target.value }))} />
              <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginTop: 4 }}>{Math.floor(giveawayForm.duration / 60)}m {giveawayForm.duration % 60}s</div>
            </div>
            <button className="btn btn-primary" onClick={createGiveaway}>🎰 Crear Sorteo</button>
          </div>

          <div>
            <div className="card-title" style={{ marginBottom: 12 }}>Sorteo actual</div>
            {!currentGiveaway && <div className="empty"><div className="empty-icon">🎰</div><p>Sin sorteo activo</p></div>}
            {currentGiveaway && (
              <div className="card" style={{ borderColor: currentGiveaway.status === 'active' ? '#00cc6633' : currentGiveaway.status === 'finished' ? '#00d4ff33' : '#ffaa0033' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem' }}>{currentGiveaway.title}</div>
                  <span className="badge badge-member" style={{ background: currentGiveaway.status === 'active' ? 'rgba(0,204,102,0.15)' : 'rgba(255,170,0,0.15)', color: currentGiveaway.status === 'active' ? '#00cc66' : '#ffaa00' }}>
                    {currentGiveaway.status === 'waiting' ? '⏳ En espera' : currentGiveaway.status === 'active' ? '🔴 Activo' : currentGiveaway.status === 'finished' ? '✅ Finalizado' : '❌ Cancelado'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#9090b0', marginBottom: 8 }}>Premios: {currentGiveaway.prizes.join(' · ')}</div>
                <div style={{ fontSize: '0.82rem', color: '#9090b0', marginBottom: 12 }}>👥 {(currentGiveaway.participants || []).length} participantes · ⏱ {currentGiveaway.duration}s</div>
                {currentGiveaway.status === 'finished' && currentGiveaway.winners?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700', marginBottom: 6 }}>🏆 Ganadores:</div>
                    {currentGiveaway.winners.map((w, i) => <div key={i} style={{ fontSize: '0.88rem' }}>{['🥇','🥈','🥉'][i]} {w.username} — {w.prize}</div>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {currentGiveaway.status === 'waiting' && (
                    <button className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #00aa44, #006622)', borderColor: '#00cc66' }}
                      onClick={async () => { await api.startGiveaway(currentGiveaway.id); api.getCurrentGiveaway().then(setCurrentGiveaway); notify(true, 'Sorteo iniciado'); }}>
                      ▶ Iniciar
                    </button>
                  )}
                  {(currentGiveaway.status === 'waiting' || currentGiveaway.status === 'active') && (
                    <button className="btn btn-secondary btn-sm" style={{ borderColor: '#ff3355', color: '#ff6688' }}
                      onClick={async () => { await api.cancelGiveaway(currentGiveaway.id); api.getCurrentGiveaway().then(setCurrentGiveaway); notify(true, 'Sorteo cancelado'); }}>
                      ✕ Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Prize Media */}
      {tab === 'media' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
          <div className="card">
            <div className="card-title">🖼️ Foto Premios Semanales</div>
            <div style={{ fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 14 }}>
              Subí una imagen mostrando los premios del evento semanal del gremio. Se mostrará en la página principal.
            </div>
            <input type="file" accept="image/*" ref={weeklyPrizeFileRef} style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) uploadWeeklyPrize(e.target.files[0]); }} />
            <button className="btn btn-primary" onClick={() => weeklyPrizeFileRef.current.click()}>📷 Subir Imagen</button>
            {weeklyPrize && (
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8, borderColor: '#ff3355', color: '#ff6688' }}
                onClick={async () => { await api.deleteWeeklyPrize(); setWeeklyPrize(null); notify(true, 'Imagen eliminada'); }}>
                🗑️ Quitar
              </button>
            )}
          </div>
          <div>
            {weeklyPrize?.url ? (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={weeklyPrize.url} alt="Premios semanales" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '10px 16px', fontSize: '0.75rem', color: '#6a6a8a' }}>Subida: {formatDate(weeklyPrize.uploaded_at)}</div>
              </div>
            ) : (
              <div className="empty"><div className="empty-icon">🖼️</div><p>Sin imagen cargada</p></div>
            )}
          </div>
        </div>
      )}

      {/* Pending Builds */}
      {tab === 'builds-pending' && (
        <div>
          <div className="section-header"><h2>Builds Pendientes de Aprobación</h2><div className="accent-line" /></div>
          {pendingBuilds.length === 0 ? (
            <div className="empty"><div className="empty-icon">✅</div><p>No hay builds pendientes de revisión</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pendingBuilds.map(b => (
                <div key={b.id} className="card" style={{ border: '1px solid rgba(255,170,0,0.3)', background: 'rgba(255,170,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.15rem', color: '#ffaa00' }}>
                        ⚔️ {b.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6a6a8a', marginTop: 4 }}>
                        Categoría: <span style={{ color: '#9090b0' }}>{b.category}</span>
                        {b.author_name && <> · Enviado por: <span style={{ color: '#00d4ff' }}>{b.author_name}</span></>}
                        {' · '}{formatDate(b.created_at)}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '0.83rem', color: '#9090b0', marginTop: 6, maxWidth: 500 }}>{b.description}</div>
                      )}
                      {b.variants?.length > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#6a6a8a', marginTop: 6 }}>
                          {b.variants.length} variante{b.variants.length !== 1 ? 's' : ''}: {b.variants.map(v => v.role).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-success btn-sm"
                        onClick={async () => {
                          try {
                            await api.approveContent(b.id);
                            setPendingBuilds(prev => prev.filter(x => x.id !== b.id));
                            notify(true, `Build "${b.name}" aprobada`);
                          } catch (e) { notify(false, e.message); }
                        }}>
                        ✅ Aprobar
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (!confirm(`¿Rechazar y eliminar la build "${b.name}"?`)) return;
                          try {
                            await api.deleteContent(b.id);
                            setPendingBuilds(prev => prev.filter(x => x.id !== b.id));
                            notify(true, `Build "${b.name}" rechazada`);
                          } catch (e) { notify(false, e.message); }
                        }}>
                        ✕ Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Albion Stats */}
      {tab === 'albion-stats' && <AlbionStatsTab />}

      {/* Banners Slideshow */}
      {tab === 'banners' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Agregar imagen al Slideshow</div>
            <div style={{ fontSize: '0.82rem', color: '#6a6a8a', marginBottom: 14 }}>
              Las imágenes se muestran como slideshow en la página principal. Podés subir varias.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Título / descripción (opcional)</label>
                <input className="input" value={bannerCaption} onChange={e => setBannerCaption(e.target.value)} placeholder="Ej: Guerra del 12/05 — Victoria" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Imagen</label>
                <input type="file" accept="image/*" ref={bannerFileRef} style={{ display: 'none' }}
                  onChange={e => setBannerFile(e.target.files[0] || null)}
                />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => bannerFileRef.current.click()}>📁 Elegir archivo</button>
                  {bannerFile && <span style={{ fontSize: '0.8rem', color: '#9090b0' }}>✓ {bannerFile.name}</span>}
                </div>
              </div>
              <button className="btn btn-primary" disabled={!bannerFile}
                onClick={async () => {
                  if (!bannerFile) return;
                  const fd = new FormData();
                  fd.append('image', bannerFile);
                  fd.append('caption', bannerCaption);
                  try {
                    await api.uploadBanner(fd);
                    api.getBanners().then(b => setBanners(Array.isArray(b) ? b : []));
                    setBannerFile(null); setBannerCaption('');
                    bannerFileRef.current.value = '';
                    notify(true, 'Imagen agregada al slideshow');
                  } catch (e) { notify(false, e.message); }
                }}>
                📷 Subir al Slideshow
              </button>
            </div>
          </div>

          {banners.length === 0 ? (
            <div className="empty"><div className="empty-icon">🎨</div><p>No hay imágenes en el slideshow</p></div>
          ) : (
            <div className="grid-3">
              {banners.map((b, i) => (
                <div key={b._id || i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <img src={b.url} alt={b.caption || ''} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.82rem', color: '#9090b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.caption || <span style={{ color: '#4a4a6a' }}>Sin título</span>}
                    </span>
                    <button className="btn-icon" style={{ borderColor: '#ff335544', color: '#ff6688', flexShrink: 0 }}
                      onClick={async () => {
                        if (!confirm('¿Eliminar esta imagen del slideshow?')) return;
                        await api.deleteBanner(b._id);
                        setBanners(prev => prev.filter(x => x._id !== b._id));
                        notify(true, 'Imagen eliminada');
                      }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
