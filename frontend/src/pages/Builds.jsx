import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ItemPicker from '../components/ItemPicker';

const RENDER = 'https://render.albiononline.com/v1/item';

const CATEGORIES = ['Todas', 'ZVZ', 'PVP', 'AVALON', 'DUNGEON', 'HCE', 'GATHERING', 'OTROS'];

const ROLES = [
  { key: 'DPS',     label: 'DPS',     color: '#ff4455' },
  { key: 'Heal',    label: 'Heal',    color: '#00cc66' },
  { key: 'Tank',    label: 'Tank',    color: '#4488ff' },
  { key: 'Support', label: 'Support', color: '#ffaa00' },
  { key: 'Ganker',  label: 'Ganker',  color: '#aa44ff' },
  { key: 'Gather',  label: 'Gather',  color: '#88cc44' },
];

const SLOTS = [
  { key: 'mainhand', label: 'Arma Ppal.' },
  { key: 'offhand',  label: 'Arma Sec.' },
  { key: 'head',     label: 'Cabeza' },
  { key: 'armor',    label: 'Pecho' },
  { key: 'shoes',    label: 'Botas' },
  { key: 'cape',     label: 'Capa' },
  { key: 'mount',    label: 'Montura' },
  { key: 'bag',      label: 'Mochila' },
  { key: 'food',     label: 'Comida' },
  { key: 'potion',   label: 'Poción' },
];

const CAT_COLORS = {
  ZVZ: '#ff3355', PVP: '#ff7700', AVALON: '#aa44ff',
  DUNGEON: '#4488ff', HCE: '#00d4ff', GATHERING: '#88cc44', OTROS: '#6a6a8a',
};

function parseEquipment(build) {
  try {
    const parsed = JSON.parse(build.items || '{}');
    if (Array.isArray(parsed)) return { slots: {}, role: null, ip: null };
    return { slots: parsed.slots || {}, role: parsed.role || null, ip: parsed.ip || null };
  } catch {
    return { slots: {}, role: null, ip: null };
  }
}

function roleStyle(key) {
  const r = ROLES.find(r => r.key === key);
  return r ? r.color : '#6a6a8a';
}

/* ── ITEM ICON ── */
function ItemIcon({ code, size = 44, showEmpty = true }) {
  const [ok, setOk] = useState(true);
  const url = code ? `${RENDER}/${code}.png` : null;

  if (!url) {
    if (!showEmpty) return null;
    return (
      <div style={{
        width: size, height: size,
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: 6,
      }} />
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
      {ok
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setOk(false)} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, opacity: 0.3 }}>?</div>
      }
    </div>
  );
}

/* ── EQUIPMENT GRID (compact, for cards) ── */
function EquipmentCompact({ slots }) {
  const top = ['mainhand', 'offhand', 'head', 'armor', 'shoes'];
  const bot = ['cape', 'mount', 'bag', 'food', 'potion'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {top.map(k => <ItemIcon key={k} code={slots[k]} size={40} />)}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {bot.map(k => <ItemIcon key={k} code={slots[k]} size={40} />)}
      </div>
    </div>
  );
}

/* ── EQUIPMENT GRID (full, for modal) ── */
function EquipmentFull({ slots }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
      {SLOTS.map(s => (
        <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <ItemIcon code={slots[s.key]} size={56} />
          <span style={{ fontSize: '0.65rem', color: '#5a5a7a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── BUILD CARD ── */
function BuildCard({ build, onView, onEdit, onDelete, isAdmin }) {
  const { slots, role, ip } = parseEquipment(build);
  const catColor = CAT_COLORS[build.category] || '#6a6a8a';
  const roleColor = roleStyle(role);
  const hasSlots = Object.values(slots).some(Boolean);

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0f0f1e, #13131f)',
      border: '1px solid #1e1e30',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = catColor + '55'; e.currentTarget.style.boxShadow = `0 0 20px ${catColor}18`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e30'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Top accent line */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${catColor}, transparent)` }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            fontSize: '0.7rem', fontFamily: 'Rajdhani', fontWeight: 700,
            letterSpacing: '0.1em', padding: '2px 10px', borderRadius: 20,
            background: catColor + '22', color: catColor, border: `1px solid ${catColor}44`,
          }}>{build.category}</span>
          {role && (
            <span style={{
              fontSize: '0.7rem', fontFamily: 'Rajdhani', fontWeight: 700,
              letterSpacing: '0.08em', padding: '2px 10px', borderRadius: 20,
              background: roleColor + '22', color: roleColor, border: `1px solid ${roleColor}44`,
            }}>{role}</span>
          )}
          {build.featured && (
            <span style={{ fontSize: '0.7rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700 }}>⭐</span>
          )}
          {ip && (
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9090b0', fontFamily: 'Rajdhani', fontWeight: 700 }}>
              ⚙ {ip} IP
            </span>
          )}
        </div>

        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: 'white', marginBottom: 6, lineHeight: 1.2 }}>
          {build.title}
        </div>

        {build.description && (
          <p style={{ fontSize: '0.8rem', color: '#6a6a8a', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {build.description}
          </p>
        )}
      </div>

      {/* Equipment */}
      {hasSlots && (
        <div style={{ padding: '0 16px 12px' }}>
          <EquipmentCompact slots={slots} />
        </div>
      )}

      {/* Image thumbnail if no slots */}
      {!hasSlots && build.image_url && (
        <img src={build.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px', marginTop: 'auto', borderTop: '1px solid #1a1a28', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#4a4a6a', flex: 1 }}>{build.author_name}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => onView(build)} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
          Ver Build
        </button>
        {isAdmin && (
          <>
            <button onClick={() => onEdit(build)} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
            <button onClick={() => onDelete(build.id)} style={{ background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.2)', color: '#ff4466', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── BUILD DETAIL MODAL ── */
function BuildModal({ build, onClose, onEdit, isAdmin }) {
  const { slots, role, ip } = parseEquipment(build);
  const catColor = CAT_COLORS[build.category] || '#6a6a8a';
  const roleColor = roleStyle(role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${catColor}, ${catColor}44)` }} />

        <div style={{ padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.1em', padding: '3px 12px', borderRadius: 20, background: catColor + '22', color: catColor, border: `1px solid ${catColor}44` }}>{build.category}</span>
                {role && <span style={{ fontSize: '0.75rem', fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 20, background: roleColor + '22', color: roleColor, border: `1px solid ${roleColor}44` }}>{role}</span>}
                {build.featured && <span style={{ fontSize: '0.75rem', color: '#ffd700', fontFamily: 'Rajdhani', fontWeight: 700, padding: '3px 0' }}>⭐ Destacada</span>}
                {ip && <span style={{ fontSize: '0.82rem', color: '#9090b0', fontFamily: 'Rajdhani', fontWeight: 700, padding: '3px 0' }}>⚙ {ip} IP</span>}
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.6rem', color: 'white', lineHeight: 1.1 }}>{build.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
              {isAdmin && (
                <button onClick={() => { onClose(); onEdit(build); }} style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.82rem' }}>✏ Editar</button>
              )}
              <button className="btn-icon" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Equipment */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e30', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Equipamiento</div>
            <EquipmentFull slots={slots} />
          </div>

          {/* Description */}
          {build.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.7rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Guía / Notas</div>
              <p style={{ color: '#b0b0c8', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{build.description}</p>
            </div>
          )}

          {/* Screenshot */}
          {build.image_url && (
            <div style={{ marginBottom: 20 }}>
              <img src={build.image_url} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid #1e1e30' }} />
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: '#4a4a6a' }}>
            Publicado por <span style={{ color: '#6a6a8a' }}>{build.author_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SLOT BUTTON (opens ItemPicker) ── */
function SlotButton({ slotKey, label, code, onOpen, onClear }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => onOpen(slotKey, label)}
          title={code || `Seleccionar ${label}`}
          style={{
            width: 54, height: 54, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
            background: code ? '#0a0a14' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${code ? '#00d4ff44' : '#1e1e30'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff88'}
          onMouseLeave={e => e.currentTarget.style.borderColor = code ? '#00d4ff44' : '#1e1e30'}
        >
          {code
            ? <img src={`https://render.albiononline.com/v1/item/${code}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
            : <span style={{ color: '#2a2a3a', fontSize: '1.3rem' }}>+</span>
          }
        </div>
        {code && (
          <button
            onClick={() => onClear(slotKey)}
            style={{
              position: 'absolute', top: -6, right: -6,
              width: 16, height: 16, borderRadius: '50%',
              background: '#ff3355', border: 'none', color: 'white',
              fontSize: '0.6rem', cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        )}
      </div>
      <div style={{ fontSize: '0.58rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', maxWidth: 60, lineHeight: 1.2 }}>
        {label}
      </div>
    </div>
  );
}

/* ── BUILD CREATOR / EDITOR ── */
function BuildCreator({ build, onSave, onClose }) {
  const existing = build ? parseEquipment(build) : null;

  const [title,    setTitle]    = useState(build?.title || '');
  const [category, setCategory] = useState(build?.category || 'ZVZ');
  const [role,     setRole]     = useState(existing?.role || '');
  const [ip,       setIp]       = useState(existing?.ip || '');
  const [desc,     setDesc]     = useState(build?.description || '');
  const [featured, setFeatured] = useState(build?.featured || false);
  const [slots,    setSlots]    = useState(existing?.slots || {});
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [picker,   setPicker]   = useState(null); // { key, label }

  const openPicker  = (key, label) => setPicker({ key, label });
  const closePicker = () => setPicker(null);

  const handlePicked = ({ code }) => {
    setSlots(s => ({ ...s, [picker.key]: code }));
    setPicker(null);
  };

  const clearSlot = (key) => setSlots(s => ({ ...s, [key]: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es requerido'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('category', category);
      fd.append('description', desc);
      fd.append('featured', featured ? 'true' : 'false');
      fd.append('items', JSON.stringify({ slots, role: role || null, ip: ip ? parseInt(ip) : null }));
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
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 780, padding: 0, overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #00d4ff, #0044aa)' }} />
          <div style={{ padding: '24px 28px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: 'white', letterSpacing: '0.05em' }}>
                {build ? '✏ Editar Build' : '+ Nueva Build'}
              </div>
              <button className="btn-icon" onClick={onClose}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Title + IP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Título</div>
                  <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del build..." required />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>IP Est.</div>
                  <input className="input" type="number" value={ip} onChange={e => setIp(e.target.value)} placeholder="1100" style={{ width: 90 }} />
                </div>
              </div>

              {/* Category */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Categoría</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORIES.slice(1).map(c => {
                    const col = CAT_COLORS[c] || '#6a6a8a';
                    const active = category === c;
                    return (
                      <button key={c} type="button" onClick={() => setCategory(c)} style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: '0.78rem',
                        fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                        border: `1px solid ${active ? col + '88' : '#1e1e30'}`,
                        background: active ? col + '22' : 'transparent',
                        color: active ? col : '#6a6a8a', transition: 'all 0.15s',
                      }}>{c}</button>
                    );
                  })}
                </div>
              </div>

              {/* Role */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Rol</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ROLES.map(r => {
                    const active = role === r.key;
                    return (
                      <button key={r.key} type="button" onClick={() => setRole(active ? '' : r.key)} style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: '0.78rem',
                        fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                        border: `1px solid ${active ? r.color + '88' : '#1e1e30'}`,
                        background: active ? r.color + '22' : 'transparent',
                        color: active ? r.color : '#6a6a8a', transition: 'all 0.15s',
                      }}>{r.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Equipment slots — click to open picker */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Equipamiento</div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e30', borderRadius: 10, padding: '20px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                    {SLOTS.map(s => (
                      <SlotButton
                        key={s.key}
                        slotKey={s.key}
                        label={s.label}
                        code={slots[s.key] || ''}
                        onOpen={openPicker}
                        onClear={clearSlot}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Guía / Notas</div>
                <textarea className="textarea" value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Rotaciones, consejos, variaciones..." />
              </div>

              {/* Image + featured */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Imagen (opcional)</div>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ fontSize: '0.82rem', color: '#9090b0' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#ffd700' }} />
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', color: featured ? '#ffd700' : '#6a6a8a' }}>⭐ Destacar</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : build ? 'Guardar cambios' : 'Crear build'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {picker && (
        <ItemPicker
          slot={picker.key}
          slotLabel={picker.label}
          onSelect={handlePicked}
          onClose={closePicker}
        />
      )}
    </>
  );
}

/* ── MAIN PAGE ── */
export default function Builds() {
  const { isAdmin } = useAuth();
  const [builds,   setBuilds]   = useState([]);
  const [category, setCategory] = useState('Todas');
  const [viewing,  setViewing]  = useState(null);
  const [editing,  setEditing]  = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback((cat) => {
    setLoading(true);
    api.getBuilds(cat === 'Todas' ? '' : cat)
      .then(setBuilds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(category); }, [category]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta build?')) return;
    await api.deleteBuild(id).catch(() => {});
    load(category);
  };

  const handleSaved = () => {
    setCreating(false);
    setEditing(null);
    load(category);
  };

  const handleEdit = (build) => {
    setViewing(null);
    setEditing(build);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="section-header">
        <h2>Builds del Gremio</h2>
        <div className="accent-line" />
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            + Nueva Build
          </button>
        )}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {CATEGORIES.map(c => {
          const col = CAT_COLORS[c] || '#00d4ff';
          const active = category === c;
          return (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '6px 18px', borderRadius: 20,
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em',
              cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${active ? (c === 'Todas' ? '#00d4ff88' : col + '88') : '#1e1e30'}`,
              background: active ? (c === 'Todas' ? 'rgba(0,212,255,0.12)' : col + '18') : 'transparent',
              color: active ? (c === 'Todas' ? '#00d4ff' : col) : '#6a6a8a',
            }}>{c}</button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : builds.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⚔️</div>
          <p>No hay builds en esta categoría</p>
          {isAdmin && <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setCreating(true)}>Crear la primera</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {builds.map(b => (
            <BuildCard
              key={b.id}
              build={b}
              isAdmin={isAdmin}
              onView={setViewing}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {viewing && (
        <BuildModal build={viewing} onClose={() => setViewing(null)} onEdit={handleEdit} isAdmin={isAdmin} />
      )}
      {(creating || editing) && (
        <BuildCreator
          build={editing || null}
          onSave={handleSaved}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
