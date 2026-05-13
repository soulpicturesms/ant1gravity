import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const SLOT_LABELS = { head: '🪖 Cabeza', chest: '🛡️ Pecho', feet: '👢 Pies', main_hand: '⚔️ Mano Principal', off_hand: '🔰 Mano Secundaria', cape: '🧣 Capa', mount: '🐺 Montura', food: '🍖 Comida', potion: '⚗️ Poción' };
const SLOTS = Object.keys(SLOT_LABELS);

function ReportModal({ report, presets, onSave, onClose }) {
  const [selectedPresets, setSelectedPresets] = useState([]);
  const [customAmount, setCustomAmount] = useState(0);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullImg, setFullImg] = useState(false);

  const totalCoins = selectedPresets.reduce((sum, pid) => {
    const p = presets.find(pr => pr.id === pid);
    return sum + (p?.coin_value || 0);
  }, 0) + (parseInt(customAmount) || 0);

  const togglePreset = (id) => {
    setSelectedPresets(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleAward = async () => {
    setLoading(true);
    setError('');
    try {
      await api.awardCoins(report.id, { preset_ids: selectedPresets, custom_amount: parseInt(customAmount) || 0, admin_notes: adminNotes });
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('¿Rechazar este reporte?')) return;
    await api.rejectReport(report.id, { admin_notes: adminNotes });
    onSave();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 750 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Reporte #{report.id} — {report.username}</div>
            <div style={{ fontSize: '0.8rem', color: '#6a6a8a', marginTop: 4 }}>{new Date(report.created_at).toLocaleString('es-ES')}</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Screenshot */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Screenshot de la muerte</div>
          <img src={report.screenshot_url} alt="death" className="screenshot-preview" onClick={() => setFullImg(true)} style={{ maxHeight: 250 }} />
          {report.description && <p style={{ marginTop: 8, color: '#9090b0', fontSize: '0.88rem' }}>{report.description}</p>}
        </div>

        {/* Equipment selector */}
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Seleccionar equipamiento perdido
        </div>

        {SLOTS.map(slot => {
          const slotPresets = presets.filter(p => p.slot === slot);
          if (slotPresets.length === 0) return null;
          return (
            <div key={slot} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{SLOT_LABELS[slot]}</div>
              <div className="preset-grid">
                {slotPresets.map(p => (
                  <button key={p.id} className={`preset-btn ${selectedPresets.includes(p.id) ? 'selected' : ''}`} onClick={() => togglePreset(p.id)}>
                    {p.name}
                    <span className="preset-value">⚡ {p.coin_value}</span>
                    <span className="preset-tier">{p.tier}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Monto adicional (coins)</label>
            <input type="number" className="input" value={customAmount} onChange={e => setCustomAmount(e.target.value)} min="0" />
          </div>
          <div style={{ background: '#1a1a2a', border: '1px solid #252535', borderRadius: 8, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total a acreditar</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color: '#ffd700' }}>⚡ {totalCoins}</div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Notas del admin</label>
          <input className="input" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Opcional..." />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-danger btn-sm" onClick={handleReject}>Rechazar</button>
          <button className="btn btn-success" onClick={handleAward} disabled={loading || totalCoins === 0}>
            {loading ? 'Acreditando...' : `✓ Acreditar ⚡ ${totalCoins}`}
          </button>
        </div>

        {fullImg && (
          <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setFullImg(false)}>
            <img src={report.screenshot_url} alt="full" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reequip() {
  const { user, isAdmin, refreshUser } = useAuth();
  const [tab, setTab] = useState('submit');
  const [myReports, setMyReports] = useState([]);
  const [adminReports, setAdminReports] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = () => {
    api.getPresets().then(setPresets);
    api.getMyReports().then(setMyReports);
    if (isAdmin) api.getAdminReports(filterStatus).then(setAdminReports);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (isAdmin) api.getAdminReports(filterStatus).then(setAdminReports); }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Debes subir un screenshot');
    setLoading(true);
    setError('');
    const fd = new FormData();
    fd.append('screenshot', file);
    fd.append('description', desc);
    try {
      await api.submitReport(fd);
      setSuccess('¡Reporte enviado! Un admin lo revisará pronto.');
      setFile(null);
      setDesc('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id) => {
    try {
      await api.claimReport(id);
      setSuccess('¡Coins marcadas como reclamadas!');
      loadData();
      refreshUser();
    } catch (err) {
      setError(err.message);
    }
  };

  const STATUS_BADGE = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
  const STATUS_LABEL = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

  const tabs = [
    { id: 'submit', label: '📸 Reportar Muerte' },
    { id: 'my', label: '📋 Mis Reportes' },
    ...(isAdmin ? [{ id: 'admin', label: '⚙️ Panel Admin' }] : []),
  ];

  return (
    <div className="page">
      <div className="section-header">
        <h2>Sistema de Reequipo</h2>
        <div className="accent-line" />
        <div style={{ background: '#1a1a2a', border: '1px solid #252535', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#6a6a8a' }}>Tus Coins</span>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#ffd700' }}>⚡ {user?.coins || 0}</span>
        </div>
      </div>

      {(success || error) && (
        <div className={`alert ${success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {success || error}
          <button style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => { setSuccess(''); setError(''); }}>✕</button>
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Submit Report */}
      {tab === 'submit' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card">
            <div className="card-title">Reportar Muerte</div>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              Si moriste en el juego, sube el screenshot de tu death screen. Un admin revisará el equipo perdido y te acreditará los coins correspondientes.
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Screenshot de la muerte *</label>
                <input type="file" className="input" accept="image/*" onChange={e => setFile(e.target.files[0])} required style={{ padding: 10 }} />
                {file && <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#00cc66' }}>✓ {file.name}</div>}
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea className="textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Dónde moriste, qué estabas haciendo, etc." rows={3} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Enviando...' : '📸 Enviar Reporte'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Reports */}
      {tab === 'my' && (
        <div>
          {myReports.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>No has reportado muertes aún</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myReports.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={r.screenshot_url} alt="" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #252535', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6a6a8a' }}>Reporte #{r.id} · {new Date(r.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                    {r.items_lost && <div style={{ fontSize: '0.82rem', color: '#9090b0', marginBottom: 4 }}>Items: {r.items_lost}</div>}
                    {r.admin_notes && <div style={{ fontSize: '0.82rem', color: '#6a6a8a', fontStyle: 'italic' }}>{r.admin_notes}</div>}
                    {r.status === 'approved' && (
                      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700', fontSize: '1.1rem' }}>
                        ⚡ {r.coins_awarded} coins acreditadas {r.claimed ? <span style={{ color: '#00cc66', fontSize: '0.8rem' }}>✓ Reclamado</span> : ''}
                      </div>
                    )}
                  </div>
                  {r.status === 'approved' && !r.claimed && (
                    <button className="btn btn-success btn-sm" onClick={() => handleClaim(r.id)}>✓ Marcar Reclamado</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Panel */}
      {tab === 'admin' && isAdmin && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['pending', 'approved', 'rejected', ''].map(s => (
              <button key={s} className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilterStatus(s)}>
                {s === '' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : 'Rechazados'}
              </button>
            ))}
          </div>

          {adminReports.length === 0 ? (
            <div className="empty"><div className="empty-icon">✅</div><p>No hay reportes {filterStatus === 'pending' ? 'pendientes' : ''}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {adminReports.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <img src={r.screenshot_url} alt="" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #252535', cursor: 'pointer', flexShrink: 0 }} onClick={() => setSelectedReport(r)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00aacc, #0044aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', overflow: 'hidden', fontSize: '0.75rem', flexShrink: 0 }}>
                        {r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.username[0].toUpperCase()}
                      </div>
                      <strong style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{r.username}</strong>
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      <span style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>#{r.id} · {new Date(r.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                    {r.items_lost && <div style={{ fontSize: '0.8rem', color: '#9090b0' }}>{r.items_lost}</div>}
                    {r.coins_awarded > 0 && <div style={{ fontSize: '0.85rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>⚡ {r.coins_awarded} acreditados</div>}
                  </div>
                  {r.status === 'pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => setSelectedReport(r)}>Revisar →</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          presets={presets}
          onSave={() => { setSelectedReport(null); loadData(); refreshUser(); setSuccess('Reporte procesado correctamente'); }}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
