import React, { useState } from 'react';
import { api } from '../api/api';

const chip = (bg, color) => ({
  display: 'inline-block', padding: '2px 8px', margin: '0 6px 6px 0', borderRadius: 4,
  fontSize: '0.8rem', background: bg, color, border: `1px solid ${color}44`,
});

function NameList({ title, color, items, render }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color, letterSpacing: '0.05em', marginBottom: 6 }}>
        {title} ({items.length})
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {items.map((it, i) => <span key={i} style={chip(`${color}14`, color)}>{render ? render(it) : it}</span>)}
      </div>
    </div>
  );
}

export default function GuildSyncCard({ onSynced, notify }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try { setPreview(await api.guildSyncPreview()); }
    catch (e) { notify(false, e.message); }
    finally { setLoading(false); }
  };

  const apply = async () => {
    const p = preview;
    const lines = [`Altas: ${p.add.length}`, `Bajas: ${p.remove.length}`, `Aprobados: ${p.approve.length}`, `Stats actualizados: ${p.updateCount}`];
    if (!confirm(`¿Aplicar la sincronización con Albion?\n\n${lines.join('\n')}`)) return;
    if (p.suspicious && !confirm(`⚠️ Se darían de baja ${p.remove.length} miembros, muchos más de lo normal. Puede ser un fallo de la API de Albion.\n\n¿Seguro que quieres continuar?`)) return;
    setLoading(true);
    try {
      const r = await api.guildSyncApply(p.suspicious);
      notify(true, `Sincronizado: ${r.add.length} altas, ${r.remove.length} bajas, ${r.approve.length} aprobados, ${r.updateCount} stats actualizados`);
      setPreview(null);
      onSynced?.();
    } catch (e) { notify(false, e.message); }
    finally { setLoading(false); }
  };

  const nothingToDo = preview && !preview.add.length && !preview.remove.length && !preview.approve.length && !preview.updateCount;

  return (
    <div className="card">
      <div className="card-title">🔄 Sincronizar con Albion</div>
      <p style={{ color: '#b0b0b0', fontSize: '0.9rem', marginBottom: 14 }}>
        Compara las cuentas del portal con los miembros reales del gremio FULLPUSH: da de alta a los nuevos,
        de baja a los que se fueron y actualiza fama y avatar. Admins, oficiales y pendientes que no estén en el gremio no se tocan.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={loadPreview} disabled={loading}>
          {loading && !preview ? 'Consultando Albion…' : preview ? '↻ Volver a revisar' : '🔍 Ver cambios'}
        </button>
        {preview && !nothingToDo && (
          <button className="btn btn-primary" onClick={apply} disabled={loading}>
            {loading ? 'Sincronizando…' : '✅ Aplicar sincronización'}
          </button>
        )}
      </div>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontFamily: 'Rajdhani', fontSize: '1rem' }}>
            <span>Gremio en Albion: <b style={{ color: '#ff7a1a' }}>{preview.guildCount}</b></span>
            <span>Altas: <b style={{ color: '#00cc66' }}>{preview.add.length}</b></span>
            <span>Bajas: <b style={{ color: '#ff3355' }}>{preview.remove.length}</b></span>
            <span>Aprobados: <b style={{ color: '#ffaa00' }}>{preview.approve.length}</b></span>
            <span>Stats a actualizar: <b>{preview.updateCount}</b></span>
          </div>

          {preview.suspicious && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              ⚠️ Se darían de baja muchos más miembros de lo normal. Si no esperas tantas salidas, puede ser un fallo de la API de Albion: vuelve a revisar en unos minutos.
            </div>
          )}
          {nothingToDo && <div className="alert alert-success" style={{ marginTop: 12 }}>Todo está al día, no hay nada que sincronizar.</div>}

          <NameList title="➕ Nuevos en el gremio" color="#00cc66" items={preview.add} />
          <NameList title="➖ Se fueron del gremio" color="#ff3355" items={preview.remove}
            render={u => `${u.username}${u.activated ? ' · cuenta activa' : ''}${u.coins ? ` · ${u.coins.toLocaleString()} coins` : ''}`} />
          <NameList title="✔️ Pendientes que están en el gremio (se aprueban)" color="#ffaa00" items={preview.approve} />
        </div>
      )}
    </div>
  );
}
