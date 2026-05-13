import React, { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Todas', 'PVP', 'ZVZ', 'AVALON', 'DUNGEON', 'HCE', 'GATHERING', 'OTROS'];
const CAT_BADGES = { PVP: 'badge-pvp', ZVZ: 'badge-cta', AVALON: 'badge-avalon', DUNGEON: 'badge-dungeon', HCE: 'badge-member', GATHERING: 'badge-officer', OTROS: 'badge-member' };

function BuildModal({ build, onClose, onImageClick }) {
  if (!build) return null;
  let items = [];
  try { items = JSON.parse(build.items || '[]'); } catch { }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className={`badge ${CAT_BADGES[build.category] || 'badge-member'}`} style={{ marginBottom: 8, display: 'inline-block' }}>{build.category}</span>
            <div className="modal-title">{build.title}</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {build.image_url && (
          <img
            src={build.image_url} alt=""
            style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, marginBottom: 16, cursor: 'zoom-in' }}
            onClick={e => { e.stopPropagation(); onImageClick(build.image_url); }}
          />
        )}
        {build.description && <p style={{ color: '#b0b0c8', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{build.description}</p>}
        {items.length > 0 && (
          <>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Equipamiento</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {items.map((item, i) => (
                <span key={i} style={{ padding: '6px 14px', background: '#1a1a2a', border: '1px solid #252535', borderRadius: 6, fontSize: '0.85rem', color: '#e0e0f0' }}>{item}</span>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: 20, fontSize: '0.8rem', color: '#6a6a8a' }}>Publicado por {build.author_name}</div>
      </div>
    </div>
  );
}

function BuildForm({ build, onSave, onClose }) {
  const [form, setForm] = useState({ title: build?.title || '', category: build?.category || 'PVP', description: build?.description || '', items: build?.items || '', featured: build?.featured || 0 });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('image', file);
      if (build) await api.updateBuild(build.id, fd);
      else await api.createBuild(fd);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{build ? 'Editar Build' : 'Nueva Build'}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Título</label><input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
          <div className="form-group">
            <label>Categoría</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Descripción / Guía</label><textarea className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={5} /></div>
          <div className="form-group"><label>Items (uno por línea o separados por coma)</label><textarea className="textarea" value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} rows={4} placeholder='["Hallowfall", "Cultist Robe", ...]' /></div>
          <div className="form-group"><label>Imagen del Build</label><input type="file" className="input" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ padding: 8 }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Builds() {
  const { isAdmin } = useAuth();
  const [builds, setBuilds] = useState([]);
  const [category, setCategory] = useState('Todas');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState(null);

  const load = (cat) => {
    setLoading(true);
    api.getBuilds(cat === 'Todas' ? '' : cat).then(setBuilds).finally(() => setLoading(false));
  };

  useEffect(() => { load(category); }, [category]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta build?')) return;
    await api.deleteBuild(id);
    load(category);
  };

  return (
    <div className="page">
      <div className="section-header">
        <h2>Builds del Gremio</h2>
        <div className="accent-line" />
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nueva Build</button>}
      </div>

      <div className="category-filter">
        {CATEGORIES.map(c => (
          <button key={c} className={`category-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : builds.length === 0 ? (
        <div className="empty"><div className="empty-icon">⚔️</div><p>No hay builds en esta categoría</p></div>
      ) : (
        <div className="grid-3">
          {builds.map(b => (
            <div key={b.id} className="card build-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="build-img" onClick={() => b.image_url ? setLightboxImg(b.image_url) : setSelected(b)} style={{ cursor: b.image_url ? 'zoom-in' : 'pointer' }}>
                {b.image_url ? <img src={b.image_url} alt={b.title} /> : '⚔️'}
              </div>
              <div className="build-body">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span className={`badge ${CAT_BADGES[b.category] || 'badge-member'}`}>{b.category}</span>
                  {b.featured === 1 && <span className="badge badge-officer">⭐ Featured</span>}
                </div>
                <div className="build-title" onClick={() => setSelected(b)}>{b.title}</div>
                <p className="build-desc">{b.description}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelected(b)}>Ver Build</button>
                  {isAdmin && <>
                    <button className="btn-icon" onClick={() => { setEditing(b); setShowForm(true); }}>✏️</button>
                    <button className="btn-icon" style={{ borderColor: '#ff335544', color: '#ff6688' }} onClick={() => handleDelete(b.id)}>🗑️</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <BuildModal build={selected} onClose={() => setSelected(null)} onImageClick={img => { setSelected(null); setLightboxImg(img); }} />}
      {showForm && <BuildForm build={editing} onSave={() => { setShowForm(false); setEditing(null); load(category); }} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          <img src={lightboxImg} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
