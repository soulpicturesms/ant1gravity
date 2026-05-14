import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ItemPicker from '../components/ItemPicker';
import { SpellRow } from '../components/SpellIcon';

const RENDER = 'https://render.albiononline.com/v1/item';

const CATEGORIES = ['Todas', 'ZVZ', 'PVP', 'AVALON', 'DUNGEON', 'HCE', 'GATHERING', 'OTROS'];

const ROLES = [
  { key: 'DPS',     label: 'DPS',     color: '#ff4455' },
  { key: 'Heal',    label: 'Heal',    color: '#00cc66' },
  { key: 'Tank',    label: 'Tank',    color: '#4488ff' },
  { key: 'Support', label: 'Support', color: '#ffaa00' },
  { key: 'Ganker',  label: 'Ganker',  color: '#aa44ff' },
  { key: 'Escape',  label: 'Escape',  color: '#ff8c00' },
  { key: 'Gather',  label: 'Gather',  color: '#88cc44' },
];

const GEAR_SLOTS = [
  { key: 'mainhand', label: 'Arma Ppal.' },
  { key: 'offhand',  label: 'Arma Sec.' },
  { key: 'head',     label: 'Cabeza' },
  { key: 'armor',    label: 'Pecho' },
  { key: 'shoes',    label: 'Botas' },
  { key: 'cape',     label: 'Capa' },
];

const SHARED_SLOTS = [
  { key: 'mount',   label: 'Montura' },
  { key: 'bag',     label: 'Mochila' },
  { key: 'food',    label: 'Comida' },
  { key: 'potion',  label: 'Poción' },
];

const ALL_SLOTS = [...GEAR_SLOTS, ...SHARED_SLOTS];

const CAT_COLORS = {
  ZVZ: '#ff3355', PVP: '#ff7700', AVALON: '#aa44ff',
  DUNGEON: '#4488ff', HCE: '#00d4ff', GATHERING: '#88cc44', OTROS: '#6a6a8a',
};

function roleColor(key) {
  return ROLES.find(r => r.key === key)?.color || '#6a6a8a';
}

/* ── ITEM ICON ── */
function ItemIcon({ code, size = 40, empty = true }) {
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [code]);
  if (!code) {
    if (!empty) return null;
    return <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 5, flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 5, overflow: 'hidden', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
      {ok
        ? <img src={`${RENDER}/${code}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setOk(false)} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, fontSize: size * 0.35 }}>?</div>
      }
    </div>
  );
}

/* ── ITEM ICON WITH SPELL TOOLTIP ON HOVER ── */
function ItemIconWithSpells({ code, spells: storedSpells, size = 56, label }) {
  const ref = useRef(null);
  const [tipPos, setTipPos]   = useState(null);
  const [spells, setSpells]   = useState(storedSpells || null);
  const [loading, setLoading] = useState(false);

  // Extract baseId from item code (e.g. T8_MAIN_SWORD@2 → MAIN_SWORD)
  const baseId = code ? code.replace(/^T\d+_/, '').replace(/@\d+$/, '') : null;

  const handleEnter = async () => {
    if (!ref.current || !code) return;
    const rect = ref.current.getBoundingClientRect();
    setTipPos({ top: rect.top, centerX: rect.left + rect.width / 2 });

    // Fetch spells if not stored (API returns arrays, normalize to first option per slot)
    if (!spells && baseId && !loading) {
      setLoading(true);
      try {
        const data = await api.getItemSpells(baseId);
        const hasAny = data && ['q','w','e','passive'].some(k => data[k]?.length);
        if (hasAny) {
          const normalized = {};
          for (const k of ['q','w','e','passive']) {
            if (data[k]?.length) normalized[k] = data[k][0];
          }
          setSpells(normalized);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
  };

  const hasSpells = spells && (
    spells.q || spells.w || spells.e || spells.passive
  );

  return (
    <div
      ref={ref}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setTipPos(null)}
    >
      <ItemIcon code={code} size={size} />
      {/* Fixed-position tooltip — escapes modal overflow clipping */}
      {tipPos && (hasSpells || loading) && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: tipPos.top - 8,
          left: tipPos.centerX,
          transform: 'translate(-50%, -100%)',
          background: '#0d0d1a', border: '1px solid #2a2a40',
          borderRadius: 10, padding: '10px 14px', zIndex: 9999,
          boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
          minWidth: 160, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '0.6rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {label}
          </div>
          {loading && <div style={{ fontSize: '0.7rem', color: '#3a3a5a' }}>···</div>}
          {hasSpells && <SpellRow spells={spells} size={42} gap={6} />}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── BUILD ROW (thumbnail inside card) ── */
function BuildRow({ variant, sharedItems, size = 36 }) {
  const col = roleColor(variant.role);
  const eq = variant.equipment || {};
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 52, flexShrink: 0,
        fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.65rem',
        color: col, letterSpacing: '0.04em', textAlign: 'right', paddingRight: 6,
      }}>{variant.role}</div>
      {GEAR_SLOTS.map(s => <ItemIcon key={s.key} code={eq[s.key]?.code} size={size} />)}
      <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: size, margin: '0 2px', flexShrink: 0 }} />
      {SHARED_SLOTS.map(s => <ItemIcon key={s.key} code={sharedItems?.[s.key]?.code} size={size} />)}
    </div>
  );
}

/* ── CONTENT CARD ── */
function ContentCard({ content, onClick }) {
  const cat = content.category;
  const accent = CAT_COLORS[cat] || '#6a6a8a';
  return (
    <div
      onClick={onClick}
      style={{
        background: '#0d0d1a',
        border: `1px solid #1e1e30`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '66'; e.currentTarget.style.background = '#10101e'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e30'; e.currentTarget.style.background = '#0d0d1a'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', color: 'white', letterSpacing: '0.04em' }}>
            {content.name}
          </div>
          {content.description && (
            <div style={{ fontSize: '0.72rem', color: '#5a5a7a', marginTop: 2, lineHeight: 1.4 }}>{content.description}</div>
          )}
        </div>
        <div style={{
          background: accent + '22', border: `1px solid ${accent}44`,
          borderRadius: 5, padding: '2px 8px',
          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.65rem', color: accent, letterSpacing: '0.08em',
          flexShrink: 0, marginLeft: 10,
        }}>{cat}</div>
      </div>

      {/* Build rows thumbnail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {content.variants?.map(v => (
          <BuildRow key={v.id} variant={v} sharedItems={content.shared_items} size={34} />
        ))}
        {(!content.variants || content.variants.length === 0) && (
          <div style={{ fontSize: '0.72rem', color: '#3a3a5a', padding: '8px 0' }}>Sin builds configuradas</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #1a1a28' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {content.variants?.map(v => (
            <div key={v.id} style={{
              background: roleColor(v.role) + '22', border: `1px solid ${roleColor(v.role)}44`,
              borderRadius: 4, padding: '1px 7px',
              fontSize: '0.62rem', fontFamily: 'Rajdhani', fontWeight: 700, color: roleColor(v.role),
            }}>{v.role}</div>
          ))}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#3a3a5a' }}>
          {content.author_name && `por ${content.author_name}`}
        </div>
      </div>
    </div>
  );
}


/* ── BUILD DETAIL PANEL (inside modal, shows one variant) ── */
function formatSilver(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function BuildDetail({ variant, sharedItems }) {
  const [showAlt, setShowAlt]       = useState(false);
  const [prices, setPrices]         = useState(null);   // null=hidden, {}=loading/loaded
  const [priceLoading, setPriceLoading] = useState(false);
  const eq = showAlt ? (variant.equipment_alt || {}) : (variant.equipment || {});
  const col = roleColor(variant.role);

  function baseId(code) {
    if (!code) return null;
    return code.replace(/^T\d+_/, '').replace(/@\d+$/, '');
  }

  const fetchPrices = async () => {
    const codes = [
      ...GEAR_SLOTS.map(s => eq[s.key]?.code),
      ...SHARED_SLOTS.map(s => sharedItems?.[s.key]?.code),
    ].filter(Boolean);
    if (!codes.length) return;
    setPriceLoading(true);
    setPrices({});
    try {
      const data = await api.getMarketPrices(codes);
      const map = {};
      for (const { id, price, city } of data) map[id] = { price, city };
      setPrices(map);
    } catch { setPrices(null); }
    setPriceLoading(false);
  };

  const togglePrices = () => {
    if (prices !== null) { setPrices(null); return; }
    fetchPrices();
  };

  const allItems = [
    ...GEAR_SLOTS.map(s => ({ ...eq[s.key], label: s.label })),
    ...SHARED_SLOTS.map(s => ({ ...sharedItems?.[s.key], label: s.label })),
  ].filter(i => i?.code);

  const total = prices ? allItems.reduce((sum, i) => sum + (prices[i.code]?.price || 0), 0) : 0;

  return (
    <div>
      {/* Alt toggle + price button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {variant.has_alt && ['Principal', 'Alternativa'].map((lbl, i) => {
          const active = i === 0 ? !showAlt : showAlt;
          return (
            <button key={lbl} onClick={() => setShowAlt(i === 1)} style={{
              padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem',
              border: `1px solid ${active ? col : '#2a2a3a'}`,
              background: active ? col + '22' : 'transparent',
              color: active ? col : '#5a5a7a', transition: 'all 0.15s',
            }}>{lbl}</button>
          );
        })}
        <button onClick={togglePrices} style={{
          marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem',
          border: `1px solid ${prices !== null ? '#ffaa0055' : '#2a2a3a'}`,
          background: prices !== null ? 'rgba(255,170,0,0.1)' : 'transparent',
          color: prices !== null ? '#ffaa00' : '#5a5a7a', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {priceLoading ? '⏳ Consultando...' : prices !== null ? '💰 Ocultar precio' : '💰 Ver precio estimado'}
        </button>
      </div>

      {/* Price panel */}
      {prices !== null && !priceLoading && (
        <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {allItems.map(item => {
              const p = prices[item.code];
              return (
                <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                  <span style={{ color: '#5a5a7a', minWidth: 70, fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem' }}>{item.label}</span>
                  <span style={{ color: '#9090b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || item.code}</span>
                  <span style={{ color: p ? '#ffcc44' : '#3a3a5a', fontFamily: 'Rajdhani', fontWeight: 700, flexShrink: 0 }}>
                    {p ? `${formatSilver(p.price)} 🪙` : 'Sin datos'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,170,0,0.15)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: '#4a4a6a' }}>Precio mínimo de venta · Albion Online Data Project</span>
            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ffaa00' }}>
              ~{formatSilver(total)} plata
            </span>
          </div>
        </div>
      )}

      {/* Gear grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {GEAR_SLOTS.map(s => (
          <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ fontSize: '0.6rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            <ItemIconWithSpells
              code={eq[s.key]?.code}
              spells={eq[s.key]?.spells}
              label={eq[s.key]?.name || s.label}
              size={56}
            />
            {eq[s.key]?.name && <div style={{ fontSize: '0.65rem', color: '#9090b0', textAlign: 'center', lineHeight: 1.2 }}>{eq[s.key].name}</div>}
            {eq[s.key]?.code && <div style={{ fontSize: '0.55rem', color: '#3a3a5a', fontFamily: 'monospace' }}>{eq[s.key].code}</div>}
          </div>
        ))}
      </div>

      {/* Shared items */}
      {sharedItems && Object.values(sharedItems).some(v => v?.code) && (
        <div style={{ borderTop: '1px solid #1a1a28', paddingTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: '0.6rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Compartido</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {SHARED_SLOTS.map(s => sharedItems[s.key]?.code && (
              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: '0.55rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                <ItemIcon code={sharedItems[s.key].code} size={44} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CONTENT MODAL (role picker → build detail) ── */
function ContentModal({ content, onClose, onEdit, isAdmin }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const col = CAT_COLORS[content.category] || '#6a6a8a';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f0f1e', border: '1px solid #1e1e2e', borderRadius: 14,
        width: '94vw', maxWidth: 860, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 0 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1a1a28', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: 'white', letterSpacing: '0.05em' }}>{content.name}</span>
              <span style={{ background: col + '22', border: `1px solid ${col}44`, borderRadius: 5, padding: '1px 8px', fontSize: '0.65rem', fontFamily: 'Rajdhani', fontWeight: 700, color: col }}>{content.category}</span>
            </div>
            {content.description && <div style={{ fontSize: '0.75rem', color: '#5a5a7a', marginTop: 3 }}>{content.description}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && <button onClick={onEdit} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem' }}>Editar</button>}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: role selector */}
          <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid #1a1a28', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.6rem', color: '#3a3a5a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, paddingLeft: 4 }}>Seleccionar Rol</div>
            {content.variants?.map(v => {
              const c = roleColor(v.role);
              const active = selectedVariant?.id === v.id;
              return (
                <button key={v.id} onClick={() => setSelectedVariant(v)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${active ? c + '66' : '#1e1e30'}`,
                  background: active ? c + '18' : 'transparent',
                  color: active ? c : '#6a6a8a',
                  fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem',
                  transition: 'all 0.12s', textAlign: 'left', width: '100%',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  {v.role}
                  {v.has_alt && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: c + '88' }}>+Alt</span>}
                </button>
              );
            })}
          </div>

          {/* Right: build detail */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {!selectedVariant ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10, color: '#3a3a5a' }}>
                <div style={{ fontSize: '2rem' }}>←</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: '0.9rem' }}>Seleccioná un rol</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: roleColor(selectedVariant.role) }} />
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: 'white' }}>{selectedVariant.role}</span>
                </div>
                <BuildDetail variant={selectedVariant} sharedItems={content.shared_items} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SLOT BUTTON (in creator) ── */
function SlotButton({ slotKey, label, value, onChange, compact = false }) {
  const size = compact ? 40 : 48;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: '0.55rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => onChange(slotKey)}
          style={{
            width: size, height: size, borderRadius: 7, overflow: 'hidden', cursor: 'pointer',
            background: value?.code ? '#0a0a14' : 'rgba(255,255,255,0.03)',
            border: `1px ${value?.code ? 'solid rgba(0,212,255,0.3)' : 'dashed rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {value?.code
            ? <img src={`${RENDER}/${value.code}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            : <span style={{ color: '#2a2a3a', fontSize: size * 0.35 }}>+</span>
          }
        </div>
        {value?.code && (
          <div
            onClick={e => { e.stopPropagation(); onChange(slotKey, true); }}
            style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: '#1a1a2a', border: '1px solid #3a3a5a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.55rem', color: '#6a6a8a' }}
          >✕</div>
        )}
      </div>
    </div>
  );
}

/* ── VARIANT EDITOR (one role-build inside ContentCreator) ── */
function VariantEditor({ variant, index, onUpdate, onRemove, onDuplicate, onPickItem }) {
  const col = roleColor(variant.role);
  const customRoles = ROLES.map(r => r.key);

  return (
    <div style={{ background: '#0a0a14', border: `1px solid ${col}33`, borderRadius: 10, padding: '14px 16px', position: 'relative' }}>
      {/* Role + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <select
          value={variant.role}
          onChange={e => onUpdate(index, { ...variant, role: e.target.value })}
          style={{ background: '#0f0f1e', border: `1px solid ${col}44`, borderRadius: 6, padding: '5px 10px', color: col, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          <option value="Otro">Otro</option>
        </select>
        {!customRoles.includes(variant.role) && (
          <input value={variant.role} onChange={e => onUpdate(index, { ...variant, role: e.target.value })}
            placeholder="Nombre del rol" style={{ background: '#0f0f1e', border: '1px solid #2a2a3a', borderRadius: 6, padding: '5px 10px', color: '#e0e0f0', fontSize: '0.85rem', width: 120 }} />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={!!variant.has_alt} onChange={e => onUpdate(index, { ...variant, has_alt: e.target.checked })}
            style={{ cursor: 'pointer' }} />
          <span style={{ fontSize: '0.75rem', color: '#6a6a8a', fontFamily: 'Rajdhani' }}>2da build</span>
        </label>
        <button onClick={() => onDuplicate(index)} title="Duplicar" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 6, color: '#00d4ff88', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem' }}>⧉ Duplicar</button>
        <button onClick={() => onRemove(index)} style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.15)', borderRadius: 6, color: '#ff5555aa', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem' }}>✕</button>
      </div>

      {/* Primary equipment */}
      <div style={{ marginBottom: variant.has_alt ? 12 : 0 }}>
        <div style={{ fontSize: '0.6rem', color: '#4a4a6a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Build Principal</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GEAR_SLOTS.map(s => (
            <SlotButton key={s.key} slotKey={s.key} label={s.label} value={variant.equipment?.[s.key]}
              onChange={(k, clear) => {
                if (clear) { onUpdate(index, { ...variant, equipment: { ...variant.equipment, [k]: null } }); return; }
                onPickItem(index, 'equipment', k);
              }} compact />
          ))}
        </div>
      </div>

      {/* Alt equipment */}
      {variant.has_alt && (
        <div style={{ paddingTop: 10, borderTop: '1px solid #1a1a28' }}>
          <div style={{ fontSize: '0.6rem', color: '#ff8c0088', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Build Alternativa <span style={{ color: '#3a3a5a' }}>(slots opcionales)</span></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GEAR_SLOTS.map(s => (
              <SlotButton key={s.key} slotKey={s.key} label={s.label} value={variant.equipment_alt?.[s.key]}
                onChange={(k, clear) => {
                  if (clear) { onUpdate(index, { ...variant, equipment_alt: { ...variant.equipment_alt, [k]: null } }); return; }
                  onPickItem(index, 'equipment_alt', k);
                }} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CONTENT CREATOR / EDITOR ── */
function ContentCreator({ initial, onSave, onDelete, onClose }) {
  const isEdit = !!initial;
  const [name, setName]           = useState(initial?.name || '');
  const [category, setCategory]   = useState(initial?.category || 'ZVZ');
  const [description, setDesc]    = useState(initial?.description || '');
  const [sharedItems, setShared]  = useState(initial?.shared_items || {});
  const [variants, setVariants]   = useState(initial?.variants?.length ? initial.variants.map(v => ({ ...v, equipment: v.equipment || {}, equipment_alt: v.equipment_alt || {} })) : [{ role: 'DPS', equipment: {}, equipment_alt: {}, has_alt: false }]);
  const [picker, setPicker]       = useState(null); // { target: 'shared'|variantIndex, field: 'equipment'|'equipment_alt', slot }
  const [saving, setSaving]       = useState(false);

  const addVariant = () => setVariants(v => [...v, { role: 'DPS', equipment: {}, equipment_alt: {}, has_alt: false }]);

  const duplicateVariant = (i) => setVariants(v => {
    const copy = JSON.parse(JSON.stringify(v[i]));
    copy.role = copy.role + ' (copia)';
    const next = [...v];
    next.splice(i + 1, 0, copy);
    return next;
  });

  const handlePickerSelect = ({ id, name: iname, code }) => {
    const item = { id, name: iname, code };
    if (picker.target === 'shared') {
      setShared(s => ({ ...s, [picker.slot]: item }));
    } else {
      const i = picker.target;
      setVariants(vs => vs.map((v, idx) => idx !== i ? v : {
        ...v,
        [picker.field]: { ...(v[picker.field] || {}), [picker.slot]: item },
      }));
    }
    setPicker(null);
  };

  const getSlotForPicker = () => {
    if (!picker) return null;
    const key = picker.slot;
    const s = ALL_SLOTS.find(x => x.key === key);
    return s ? { key, label: s.label } : { key, label: key };
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), category, description: description.trim(), shared_items: sharedItems, variants };
      if (isEdit) await api.updateContent(initial.id, body);
      else await api.createContent(body);
      onSave();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const slotInfo = getSlotForPicker();

  return (
    <div className="modal-overlay">
      <div style={{
        background: '#0f0f1e', border: '1px solid #1e1e2e', borderRadius: 14,
        width: '96vw', maxWidth: 900, maxHeight: '94vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 0 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1a1a28', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: 'white', letterSpacing: '0.05em', flex: 1 }}>
            {isEdit ? 'Editar Contenido' : 'Nuevo Contenido'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* Meta */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Nombre</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Hellgate 5v5 — Marzo" style={{ width: '100%', background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 7, padding: '8px 12px', color: '#e0e0f0', fontSize: '0.9rem' }} />
            </div>
            <div style={{ width: 140 }}>
              <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Categoría</div>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 7, padding: '8px 12px', color: '#e0e0f0', fontSize: '0.85rem', cursor: 'pointer' }}>
                {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Descripción (opcional)</div>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Notas sobre el contenido..." style={{ width: '100%', background: '#0a0a14', border: '1px solid #2a2a3a', borderRadius: 7, padding: '8px 12px', color: '#e0e0f0', fontSize: '0.85rem' }} />
          </div>

          {/* Shared items */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Items Compartidos — todas las builds</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {SHARED_SLOTS.map(s => (
                <SlotButton key={s.key} slotKey={s.key} label={s.label} value={sharedItems[s.key]}
                  onChange={(k, clear) => {
                    if (clear) { setShared(x => ({ ...x, [k]: null })); return; }
                    setPicker({ target: 'shared', field: null, slot: k });
                  }} />
              ))}
            </div>
          </div>

          {/* Variants */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Builds por Rol</div>
            <button onClick={addVariant} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, color: '#00d4ff', cursor: 'pointer', padding: '5px 12px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem' }}>+ Agregar Rol</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {variants.map((v, i) => (
              <VariantEditor
                key={i} variant={v} index={i}
                onUpdate={(idx, val) => setVariants(vs => vs.map((x, j) => j === idx ? val : x))}
                onRemove={(idx) => setVariants(vs => vs.filter((_, j) => j !== idx))}
                onDuplicate={duplicateVariant}
                onPickItem={(idx, field, slot) => setPicker({ target: idx, field, slot })}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #1a1a28', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isEdit && (
            <button onClick={onDelete} style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 7, color: '#ff5555', cursor: 'pointer', padding: '8px 16px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>Eliminar</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 7, color: '#6a6a8a', cursor: 'pointer', padding: '8px 16px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.85rem' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,100,180,0.15))', border: '1px solid rgba(0,212,255,0.4)', borderRadius: 7, color: '#00d4ff', cursor: 'pointer', padding: '8px 22px', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Contenido'}
          </button>
        </div>
      </div>

      {/* Item picker */}
      {picker && slotInfo && (
        <ItemPicker
          slot={slotInfo.key}
          slotLabel={slotInfo.label}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function Builds() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [contents, setContents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('Todas');
  const [modal, setModal]         = useState(null);   // { type: 'view'|'create'|'edit', content? }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getContents(category !== 'Todas' ? category : null);
      setContents(data || []);
    } catch { setContents([]); }
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contenido?')) return;
    await api.deleteContent(id);
    setModal(null);
    load();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080810', padding: '24px 20px' }}>
      {/* Page header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.8rem', color: 'white', margin: 0, letterSpacing: '0.05em' }}>
              BUILDS
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#4a4a6a', marginTop: 2 }}>Guías de equipamiento por contenido</div>
          </div>
          {isAdmin && (
            <button onClick={() => setModal({ type: 'create' })} style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,100,180,0.1))',
              border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8,
              color: '#00d4ff', cursor: 'pointer', padding: '9px 20px',
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em',
            }}>+ Nuevo Contenido</button>
          )}
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => {
            const active = category === c;
            const col = c === 'Todas' ? '#6a6a8a' : (CAT_COLORS[c] || '#6a6a8a');
            return (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em',
                border: `1px solid ${active ? col : '#2a2a3a'}`,
                background: active ? col + '22' : 'transparent',
                color: active ? col : '#4a4a6a', transition: 'all 0.12s',
              }}>{c}</button>
            );
          })}
        </div>

        {/* Content grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a4a6a' }}>
            <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
            Cargando builds...
          </div>
        ) : contents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#3a3a5a' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚔</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: '1rem' }}>
              {isAdmin ? 'No hay contenidos. Creá el primero.' : 'No hay builds disponibles aún.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 16 }}>
            {contents.map(c => (
              <ContentCard key={c.id} content={c} onClick={() => setModal({ type: 'view', content: c })} />
            ))}
          </div>
        )}
      </div>

      {/* View modal */}
      {modal?.type === 'view' && (
        <ContentModal
          content={modal.content}
          isAdmin={isAdmin}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: 'edit', content: modal.content })}
        />
      )}

      {/* Create / Edit modal */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <ContentCreator
          initial={modal.type === 'edit' ? modal.content : null}
          onSave={() => { setModal(null); load(); }}
          onDelete={() => handleDelete(modal.content.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
