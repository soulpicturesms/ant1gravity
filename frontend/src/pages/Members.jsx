import React, { useEffect, useState } from 'react';
import { api } from '../api/api';

const ROLE_LABELS = { admin: 'Admin', officer: 'Officer', member: 'Member' };
const ROLE_BADGES = { admin: 'badge-admin', officer: 'badge-officer', member: 'badge-member' };

const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span style={{ color: '#2a2a3a', marginLeft: 4 }}>⇅</span>;
  return <span style={{ color: '#00d4ff', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [rankings, setRankings] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [minActivities, setMinActivities] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMembers(), api.getRankings()])
      .then(([m, r]) => { setMembers(m); setRankings(r); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando...</div>;

  const tabs = ['all', 'attendance'];
  const tabLabels = { all: 'Todos', attendance: 'Asistencia' };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const applyFiltersAndSort = (arr) => {
    let result = [...arr];
    if (search.trim()) result = result.filter(m => m.username.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter) result = result.filter(m => m.role === roleFilter);
    if (minActivities !== '') result = result.filter(m => (m.total_activities || 0) >= parseInt(minActivities));
    if (sortBy) {
      result.sort((a, b) => {
        const va = a[sortBy] ?? 0;
        const vb = b[sortBy] ?? 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return result;
  };

  const baseData = tab === 'attendance'
    ? (rankings?.byAttendance || [])
    : members;

  const data = applyFiltersAndSort(baseData);

  const hasFilters = search || roleFilter || minActivities !== '';

  const clearFilters = () => { setSearch(''); setRoleFilter(''); setMinActivities(''); setSortBy(''); };

  const thStyle = (field) => ({
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    color: sortBy === field ? '#00d4ff' : undefined,
  });

  const Avatar = ({ m }) => (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00aacc, #0044aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', overflow: 'hidden', border: '1px solid rgba(0,212,255,0.2)', flexShrink: 0 }}>
      {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.username[0].toUpperCase()}
    </div>
  );

  return (
    <div className="page">
      <div className="section-header">
        <h2>Miembros del Gremio</h2>
        <div className="accent-line" />
      </div>

      {/* Tabs + Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 'none' }}>
          {tabs.map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        <input
          className="input"
          placeholder="🔍 Buscar jugador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 200, marginBottom: 0 }}
        />

        <select
          className="select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ maxWidth: 150, marginBottom: 0 }}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="officer">Officer</option>
          <option value="member">Member</option>
        </select>

        <input
          className="input"
          type="number"
          placeholder="Min. actividades"
          value={minActivities}
          onChange={e => setMinActivities(e.target.value)}
          style={{ maxWidth: 150, marginBottom: 0 }}
          min="0"
        />

        {hasFilters && (
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>✕ Limpiar</button>
        )}

        <span style={{ fontSize: '0.8rem', color: '#4a4a6a', marginLeft: 4 }}>{data.length} resultado{data.length !== 1 ? 's' : ''}</span>
      </div>

      {tab === 'all' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Rol</th>
                <th style={thStyle('total_activities')} onClick={() => toggleSort('total_activities')}>
                  Actividades <SortIcon field="total_activities" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th style={thStyle('coins')} onClick={() => toggleSort('coins')}>
                  Coins <SortIcon field="coins" sortBy={sortBy} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ color: '#4a4a6a', fontFamily: 'Rajdhani', fontSize: '0.85rem' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar m={m} />
                      <span style={{ fontWeight: 600 }}>{m.username}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGES[m.role]}`}>{ROLE_LABELS[m.role]}</span></td>
                  <td style={{ color: '#9090b0' }}>{m.total_activities}</td>
                  <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#ffd700' }}>⚡ {Number(m.coins).toLocaleString('es-AR')}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#4a4a6a', padding: 32 }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Rol</th>
                <th style={thStyle('total_activities')} onClick={() => toggleSort('total_activities')}>
                  Asistencias <SortIcon field="total_activities" sortBy={sortBy} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#4a4a6a', width: 40 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar m={m} />
                      <span style={{ fontWeight: 600 }}>{m.username}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGES[m.role]}`}>{ROLE_LABELS[m.role]}</span></td>
                  <td style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#9090b0' }}>{m.total_activities}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#4a4a6a', padding: 32 }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
