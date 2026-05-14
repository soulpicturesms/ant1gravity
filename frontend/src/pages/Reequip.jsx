import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const RENDER = 'https://render.albiononline.com/v1/item';

const EQ_SLOTS = [
  { key: 'Head',     label: '🪖 Cabeza' },
  { key: 'Armor',    label: '🛡️ Pecho' },
  { key: 'Shoes',    label: '👢 Pies' },
  { key: 'MainHand', label: '⚔️ Mano Principal' },
  { key: 'OffHand',  label: '🔰 Mano Secundaria' },
  { key: 'Cape',     label: '🧣 Capa' },
  { key: 'Mount',    label: '🐺 Montura' },
  { key: 'Bag',      label: '🎒 Bolsa' },
  { key: 'Food',     label: '🍖 Comida' },
  { key: 'Potion',   label: '⚗️ Poción' },
];

function formatSilver(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

function timeAgoStr(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Admin review modal ────────────────────────────────────────────────────
function DeathRequestModal({ request, onSave, onClose }) {
  const event   = request.death_event || {};
  const victim  = event.Victim || {};
  const killer  = event.Killer || {};
  const eq      = victim.Equipment || {};

  const items = EQ_SLOTS.filter(s => eq[s.key]?.Type).map(s => ({
    key: s.key, label: s.label, type: eq[s.key].Type, quality: eq[s.key].Quality || 1,
  }));

  const [prices, setPrices]             = useState({});
  const [freshness, setFreshness]       = useState({});
  const [cityCounts, setCityCounts]     = useState({});
  const [fetchingPrices, setFetching]   = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set(items.map(i => i.key)));
  const [adminNotes, setAdminNotes]     = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const fetchPrices = async () => {
    setFetching(true); setError('');
    try {
      const codes = items.map(i => i.type).join(',');
      const data = await api.getDeathPrices(codes);

      const grouped = {};
      for (const entry of (data || [])) {
        const id = entry.item_id;
        if (!grouped[id]) grouped[id] = [];
        grouped[id].push(entry);
      }

      const priceMap = {}, freshnessMap = {}, cityCountMap = {};
      for (const item of items) {
        const entries = grouped[item.type] || [];
        let matching = entries.filter(e => e.quality === item.quality && e.sell_price_min > 0);
        if (matching.length === 0) matching = entries.filter(e => e.quality === 1 && e.sell_price_min > 0);
        if (matching.length === 0) matching = entries.filter(e => e.sell_price_min > 0);
        if (matching.length === 0) continue;

        priceMap[item.type] = Math.round(matching.reduce((s, e) => s + e.sell_price_min, 0) / matching.length);
        cityCountMap[item.type] = matching.length;
        const latest = matching.map(e => new Date(e.sell_price_min_date)).reduce((a, b) => a > b ? a : b);
        freshnessMap[item.type] = Math.round((Date.now() - latest) / 60000);
      }
      setPrices(priceMap);
      setFreshness(freshnessMap);
      setCityCounts(cityCountMap);
    } catch (e) {
      setError('Error al consultar precios: ' + e.message);
    } finally {
      setFetching(false);
    }
  };

  const toggleKey = (key) => {
    setSelectedKeys(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  };

  const silverTotal = items.filter(i => selectedKeys.has(i.key)).reduce((s, i) => s + (prices[i.type] || 0), 0);

  const handleApprove = async () => {
    setLoading(true); setError('');
    try {
      const selected_items = items
        .filter(i => selectedKeys.has(i.key))
        .map(i => ({ slot: i.key, label: i.label, type: i.type, silver: prices[i.type] || 0 }));
      await api.approveDeathRequest(request.id, { selected_items, admin_notes: adminNotes });
      onSave();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    await api.rejectDeathRequest(request.id, { admin_notes: adminNotes });
    onSave();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">⚔️ Solicitud — {request.username}</div>
            <div style={{ fontSize: '0.8rem', color: '#6a6a8a', marginTop: 4 }}>
              {request.albion_character} · {new Date(request.created_at).toLocaleString('es-ES')}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Death summary */}
        <div style={{ marginBottom: 16, padding: 12, background: '#0a0a16', borderRadius: 8, border: '1px solid #1e1e30', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', marginBottom: 2 }}>Killer</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#9090b0' }}>⚔️ {killer.Name || '—'}</div>
            {killer.GuildName && <div style={{ fontSize: '0.75rem', color: '#5a5a7a' }}>{killer.GuildName}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', marginBottom: 2 }}>Fame / Tiempo</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700' }}>{formatSilver(event.TotalVictimKillFame)}</div>
            <div style={{ fontSize: '0.72rem', color: '#5a5a7a' }}>{timeAgoStr(event.TimeStamp)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#6a6a8a', marginBottom: 2 }}>Víctima</div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ff4466' }}>💀 {victim.Name || '—'}</div>
            {victim.AverageItemPower > 0 && <div style={{ fontSize: '0.75rem', color: '#5a5a7a' }}>IP {Math.round(victim.AverageItemPower)}</div>}
          </div>
        </div>

        {/* Price fetch button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={fetchPrices} disabled={fetchingPrices || items.length === 0}>
            {fetchingPrices ? 'Consultando...' : '💰 Consultar precios del mercado'}
          </button>
          {Object.keys(prices).length > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#00cc66' }}>
              ✓ Promedio de todas las ciudades Americas + zona oscura
            </span>
          )}
        </div>

        {/* Items table */}
        {items.length === 0 ? (
          <div className="alert alert-info">No se encontraron items equipados en este evento.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: 16 }}>
            <thead>
              <tr style={{ color: '#6a6a8a', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Slot / Item</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Código</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Silver (promedio)</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.key} style={{ borderBottom: '1px solid #0d0d1e', opacity: selectedKeys.has(item.key) ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                  <td style={{ padding: '8px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={`${RENDER}/${item.type}.png`} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                      <div>
                        <div style={{ color: '#9090b0', fontSize: '0.85rem' }}>{item.label}</div>
                        <div style={{ color: '#4a4a6a', fontSize: '0.7rem' }}>Q{item.quality}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px', color: '#4a4a6a', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.type}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                    {prices[item.type] > 0 ? (
                      <div>
                        <div style={{ color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>{formatSilver(prices[item.type])}</div>
                        <div style={{ fontSize: '0.68rem', color: '#4a4a6a' }}>
                          {cityCounts[item.type]}c ·{' '}
                          {freshness[item.type] < 60 ? `${freshness[item.type]}m` : `${Math.round(freshness[item.type] / 60)}h`} ago
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#4a4a6a' }}>{Object.keys(prices).length > 0 ? 'sin datos' : '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedKeys.has(item.key)} onChange={() => toggleKey(item.key)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Total */}
        <div style={{ background: '#1a1a2a', border: '1px solid #252535', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: '0.75rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Silver = Coins (1:1)</div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color: '#ffd700' }}>⚡ {formatSilver(silverTotal)}</div>
          {silverTotal === 0 && Object.keys(prices).length === 0 && (
            <div style={{ fontSize: '0.75rem', color: '#5a5a7a', marginTop: 4 }}>Consultá los precios para calcular el total</div>
          )}
        </div>

        <div className="form-group">
          <label>Notas del admin</label>
          <input className="input" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Opcional..." />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-danger btn-sm" onClick={handleReject}>Rechazar</button>
          <button className="btn btn-success" onClick={handleApprove} disabled={loading || silverTotal === 0}>
            {loading ? 'Aprobando...' : `✓ Aprobar ⚡ ${formatSilver(silverTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Reequip() {
  const { user, isAdmin, refreshUser } = useAuth();
  const [tab, setTab] = useState('my');

  const [myDeathRequests, setMyDeathRequests]     = useState([]);
  const [adminDeathRequests, setAdminDeathRequests] = useState([]);
  const [selectedRequest, setSelectedRequest]     = useState(null);
  const [deathFilter, setDeathFilter]             = useState('pending');
  const [stats, setStats]                         = useState(null);
  const [statsLoading, setStatsLoading]           = useState(false);
  const [success, setSuccess]                     = useState('');
  const [error, setError]                         = useState('');

  const loadRequests = useCallback(() => {
    api.getMyDeathRequests().then(setMyDeathRequests).catch(() => {});
    if (isAdmin) api.getAdminDeathRequests(deathFilter).then(setAdminDeathRequests).catch(() => {});
  }, [isAdmin, deathFilter]);

  useEffect(() => { loadRequests(); }, [deathFilter]);

  useEffect(() => {
    if (tab === 'stats' && isAdmin && !stats) {
      setStatsLoading(true);
      api.getDeathStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
    }
  }, [tab]);

  const handleClaimDeath = async (id) => {
    try {
      await api.claimDeathRequest(id);
      setSuccess('¡Reclamado!');
      loadRequests(); refreshUser();
    } catch (e) { setError(e.message); }
  };

  const STATUS_BADGE = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
  const STATUS_LABEL = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

  const tabs = [
    { id: 'my',    label: '⚔️ Mis Solicitudes' },
    ...(isAdmin ? [
      { id: 'admin', label: '⚙️ Solicitudes Admin' },
      { id: 'stats', label: '📊 Estadísticas' },
    ] : []),
  ];

  return (
    <div className="page">
      <div className="section-header">
        <h2>Sistema de Reequipo</h2>
        <div className="accent-line" />
        <div style={{ background: '#1a1a2a', border: '1px solid #252535', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: '#6a6a8a' }}>Tus Coins</span>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#ffd700' }}>⚡ {(user?.coins || 0).toLocaleString()}</span>
        </div>
      </div>

      {(success || error) && (
        <div className={`alert ${success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
          {success || error}
          <button style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => { setSuccess(''); setError(''); }}>✕</button>
        </div>
      )}

      {!user?.albion_character && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          Vinculá tu personaje de Albion en tu <a href="/profile" style={{ color: '#00d4ff', fontWeight: 600 }}>Perfil</a> para solicitar reequipo desde el{' '}
          <a href="/killboard" style={{ color: '#00d4ff', fontWeight: 600 }}>Killboard → Mis Muertes</a>.
        </div>
      )}

      <div className="tabs">
        {tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── Mis solicitudes ── */}
      {tab === 'my' && (
        <div>
          {myDeathRequests.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⚔️</div>
              <p>No tenés solicitudes de reequipo aún</p>
              <a href="/killboard" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Ir al Killboard →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myDeathRequests.map(r => {
                const ev = r.death_event || {};
                return (
                  <div key={r.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                        <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        <span style={{ fontFamily: 'Rajdhani', fontWeight: 600, color: '#9090b0', fontSize: '0.9rem' }}>
                          Muerto por <strong style={{ color: '#ff8888' }}>{ev.Killer?.Name || '—'}</strong>
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>{timeAgoStr(ev.TimeStamp)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#4a4a6a' }}>{new Date(r.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                      {r.selected_items?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                          {r.selected_items.map(item => (
                            <img key={item.slot} src={`${RENDER}/${item.type}.png`} alt={item.label} title={`${item.label} — ${formatSilver(item.silver)} silver`}
                              style={{ width: 28, height: 28, objectFit: 'contain', background: 'rgba(255,255,255,0.05)', borderRadius: 3, border: '1px solid #1e1e30' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ))}
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700', fontSize: '1.1rem' }}>
                          ⚡ {formatSilver(r.coins_awarded)} coins {r.claimed && <span style={{ color: '#00cc66', fontSize: '0.8rem' }}>✓ Reclamado</span>}
                        </div>
                      )}
                      {r.admin_notes && <div style={{ fontSize: '0.82rem', color: '#6a6a8a', fontStyle: 'italic', marginTop: 4 }}>{r.admin_notes}</div>}
                    </div>
                    {r.status === 'approved' && !r.claimed && (
                      <button className="btn btn-success btn-sm" onClick={() => handleClaimDeath(r.id)}>✓ Marcar Reclamado</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Admin: solicitudes ── */}
      {tab === 'admin' && isAdmin && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['pending', 'approved', 'rejected', 'all'].map(s => (
              <button key={s} className={`btn ${deathFilter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setDeathFilter(s)}>
                {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : 'Rechazados'}
              </button>
            ))}
          </div>
          {adminDeathRequests.length === 0 ? (
            <div className="empty"><div className="empty-icon">⚔️</div><p>No hay solicitudes {deathFilter === 'pending' ? 'pendientes' : ''}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {adminDeathRequests.map(r => {
                const ev = r.death_event || {};
                return (
                  <div key={r.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                        <strong style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{r.username}</strong>
                        <span style={{ fontSize: '0.82rem', color: '#00d4ff' }}>{r.albion_character}</span>
                        <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                        <span style={{ fontSize: '0.78rem', color: '#6a6a8a' }}>{new Date(r.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#9090b0', marginBottom: 6 }}>
                        Muerto por <strong style={{ color: '#ff8888' }}>{ev.Killer?.Name || '—'}</strong>
                        {ev.Killer?.GuildName ? ` (${ev.Killer.GuildName})` : ''} · {timeAgoStr(ev.TimeStamp)}
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {EQ_SLOTS.filter(s => ev.Victim?.Equipment?.[s.key]?.Type).map(s => (
                          <img key={s.key} src={`${RENDER}/${ev.Victim.Equipment[s.key].Type}.png`} alt={s.label} title={s.label}
                            style={{ width: 28, height: 28, objectFit: 'contain', background: 'rgba(255,255,255,0.05)', borderRadius: 3, border: '1px solid #1e1e30' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                      {r.coins_awarded > 0 && <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700', marginTop: 6 }}>⚡ {formatSilver(r.coins_awarded)}</div>}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setSelectedRequest(r)}>
                      {r.status === 'pending' ? 'Revisar →' : 'Ver →'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Admin: stats ── */}
      {tab === 'stats' && isAdmin && (
        <div>
          {statsLoading && <div className="loading"><div className="spinner" /> Cargando estadísticas...</div>}
          {stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Total Silver Gastado', value: formatSilver(stats.totalSilver), color: '#ffd700' },
                  { label: 'Aprobados',  value: stats.counts.approved || 0,  color: '#00cc66' },
                  { label: 'Pendientes', value: stats.counts.pending  || 0,  color: '#ffaa00' },
                  { label: 'Rechazados', value: stats.counts.rejected || 0,  color: '#ff4466' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)', border: '1px solid #1e1e30', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.8rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {stats.topUsers?.length > 0 && (
                <div className="card">
                  <div className="card-title">Top Usuarios por Silver Recibido</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#6a6a8a', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>#</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Usuario</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Silver Total</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #1e1e30' }}>Solicitudes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topUsers.map((u, i) => (
                        <tr key={u.username} style={{ borderBottom: '1px solid #0d0d1e' }}>
                          <td style={{ padding: '8px 8px', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#6a6a8a', fontFamily: 'Rajdhani', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: '8px 8px', fontFamily: 'Rajdhani', fontWeight: 600, color: '#e0e0f0' }}>{u.username}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>{formatSilver(u.total_silver)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#6a6a8a' }}>{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {stats.timeline?.length > 0 && (
                <div className="card">
                  <div className="card-title">Reequipos — Últimos 30 días</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stats.timeline.slice(-15).map(day => (
                      <div key={day.date} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6a6a8a', minWidth: 80 }}>{day.date}</span>
                        <div style={{ flex: 1, height: 8, background: '#1e1e30', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(to right, #ffd700, #ff8800)', width: `${Math.min(100, (day.silver / (stats.totalSilver || 1)) * 100 * 5)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#ffd700', minWidth: 70, textAlign: 'right', fontFamily: 'Rajdhani', fontWeight: 700 }}>{formatSilver(day.silver)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#6a6a8a', minWidth: 30 }}>{day.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <DeathRequestModal
          request={selectedRequest}
          onSave={() => { setSelectedRequest(null); loadRequests(); refreshUser(); setSuccess('Solicitud procesada.'); }}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
