import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

function fmtFame(n) {
  if (!n) return '0';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const MEDAL = ['🥇', '🥈', '🥉'];

const TOPS = [
  { key: 'pvp',       label: '⚔️ PvP',        dataKey: 'byKillFame',  statKey: 'killFame',  color: '#ff4466', desc: 'Kill Fame total' },
  { key: 'pve',       label: '🐉 PvE',        dataKey: 'byPve',       statKey: 'pve',       color: '#a78bfa', desc: 'PvE Fame total' },
  { key: 'gathering', label: '⛏️ Recolección', dataKey: 'byGathering', statKey: 'gathering', color: '#00e8c0', desc: 'Fame de recolección total' },
  { key: 'crafting',  label: '🔨 Crafting',    dataKey: 'byCrafting',  statKey: 'crafting',  color: '#ffd700', desc: 'Fame de crafting total' },
];

export default function AlbionStatsTab() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTop, setActiveTop] = useState('pvp');

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await api.getAlbionStats()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#e0e0f0' }}>Stats de Miembros — Albion Online</div>
          {data?.fetchedAt && (
            <div style={{ fontSize: '0.72rem', color: '#4a4a6a', marginTop: 3 }}>
              Datos del {new Date(data.fetchedAt).toLocaleString('es-ES')} · cache de 30 min
            </div>
          )}
        </div>
        <button onClick={load} disabled={loading} style={{ background: 'transparent', border: '1px solid #1e1e30', borderRadius: 6, color: '#6a6a8a', cursor: loading ? 'default' : 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.85rem', padding: '7px 14px' }}>
          {loading ? '···' : '↻ Refrescar'}
        </button>
      </div>

      {loading && <div className="loading"><div className="spinner" /> Obteniendo stats de Albion... (~5 seg)</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {data && !loading && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {TOPS.map(t => (
              <button key={t.key} onClick={() => setActiveTop(t.key)} style={{
                padding: '7px 18px', borderRadius: 6,
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                border: `1px solid ${activeTop === t.key ? t.color + '66' : '#1e1e30'}`,
                background: activeTop === t.key ? t.color + '18' : 'transparent',
                color: activeTop === t.key ? t.color : '#6a6a8a',
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {TOPS.map(t => {
            if (activeTop !== t.key) return null;
            const list = data[t.dataKey] || [];
            return (
              <div key={t.key}>
                <div style={{ fontSize: '0.72rem', color: '#5a5a7a', marginBottom: 12 }}>{t.desc} · {list.length} miembros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map((p, i) => {
                    const pct  = list[0][t.statKey] > 0 ? (p[t.statKey] / list[0][t.statKey]) * 100 : 0;
                    const top3 = i < 3;
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: top3 ? t.color + '0d' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${top3 ? t.color + '33' : '#1a1a28'}`,
                        borderLeft: `3px solid ${top3 ? t.color : '#1a1a28'}`,
                        borderRadius: 8, padding: '10px 16px',
                      }}>
                        <div style={{ width: 28, textAlign: 'center', fontSize: top3 ? '1.2rem' : '0.9rem', fontFamily: 'Rajdhani', fontWeight: 700, color: '#5a5a7a', flexShrink: 0 }}>
                          {top3 ? MEDAL[i] : '#' + (i + 1)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: top3 ? '#e0e0f0' : '#a0a0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </div>
                          <div style={{ height: 3, background: '#1a1a28', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: pct + '%', background: t.color, borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: t.color, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                          {fmtFame(p[t.statKey])}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {t.key === 'gathering' && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem', color: '#5a5a7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Top por recurso</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                      {[
                        { key: 'wood',  label: '🪵 Madera',  color: '#a0522d' },
                        { key: 'fiber', label: '🌿 Fibra',   color: '#4aee4a' },
                        { key: 'ore',   label: '⛏️ Mineral', color: '#aaaaaa' },
                        { key: 'hide',  label: '🦌 Pieles',  color: '#cc8844' },
                        { key: 'rock',  label: '🪨 Piedra',  color: '#888888' },
                      ].map(res => {
                        const top = [...(data.raw || [])].sort((a, b) => (b.gatheringByType?.[res.key] || 0) - (a.gatheringByType?.[res.key] || 0))[0];
                        if (!top?.gatheringByType?.[res.key]) return null;
                        return (
                          <div key={res.key} style={{ background: '#0a0a14', border: '1px solid ' + res.color + '33', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: '0.78rem', color: res.color, fontFamily: 'Rajdhani', fontWeight: 700, marginBottom: 4 }}>{res.label}</div>
                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', color: '#e0e0f0' }}>{top.name}</div>
                            <div style={{ fontSize: '0.85rem', color: res.color, fontFamily: 'Rajdhani', fontWeight: 700 }}>{fmtFame(top.gatheringByType[res.key])}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
