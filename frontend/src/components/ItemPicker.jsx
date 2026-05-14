import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/api';
import { ITEM_SKILLS } from '../data/item-skills';
import { SpellIcon } from './SpellIcon';

const RENDER = 'https://render.albiononline.com/v1/item';
const TIERS = [4, 5, 6, 7, 8];
const ENCHANTS = [0, 1, 2, 3, 4];

// Slots that don't support enchantment
const NO_ENCHANT = new Set(['mount', 'bag', 'food', 'potion']);

function itemUrl(id, tier) {
  return `${RENDER}/T${tier}_${id}.png`;
}

function buildCode(id, tier, enchant) {
  return enchant > 0 ? `T${tier}_${id}@${enchant}` : `T${tier}_${id}`;
}

const SLOT_CFG = {
  Q:      { color: '#00d4ff', bg: 'rgba(0,212,255,0.12)',  border: 'rgba(0,212,255,0.35)',  label: 'Q' },
  W:      { color: '#00e8c0', bg: 'rgba(0,232,192,0.12)',  border: 'rgba(0,232,192,0.35)',  label: 'W' },
  E:      { color: '#ff8c00', bg: 'rgba(255,140,0,0.12)',  border: 'rgba(255,140,0,0.35)',  label: 'E' },
  Pasiva: { color: '#ffaa00', bg: 'rgba(255,170,0,0.12)',  border: 'rgba(255,170,0,0.35)',  label: '★' },
};

const ENCHANT_COLORS = ['', '#4aee4a', '#5a5aff', '#cc44cc', '#ee8800'];

function SkillsPanel({ baseId }) {
  const skills = ITEM_SKILLS[baseId];
  if (!skills) return (
    <div style={{ fontSize: '0.72rem', color: '#4a4a6a', textAlign: 'center', padding: '8px 0', lineHeight: 1.6 }}>
      Skills no disponibles.{' '}
      <a
        href={`https://albiononline2d.com/en/item/id/${baseId}`}
        target="_blank"
        rel="noreferrer"
        style={{ color: '#00d4ff88', textDecoration: 'none' }}
      >
        Ver en albiononline2d.com ↗
      </a>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {[['Q', skills.q], ['W', skills.w], ['E', skills.e], ['Pasiva', skills.passive]]
        .filter(([, v]) => v)
        .map(([key, skill]) => {
          const cfg = SLOT_CFG[key];
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 7, padding: '5px 8px',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                background: `rgba(0,0,0,0.4)`,
                border: `1px solid ${cfg.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Rajdhani', fontWeight: 800, fontSize: '0.72rem',
                color: cfg.color,
              }}>
                {cfg.label}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#d8d8f0', flex: 1, lineHeight: 1.2 }}>{skill}</span>
              <span style={{ color: cfg.color, fontSize: '0.75rem', flexShrink: 0 }}>✓</span>
            </div>
          );
        })
      }
    </div>
  );
}

const SLOT_LABELS = { q: 'Q', w: 'W', e: 'E', passive: '★' };

function SpellSlotPicker({ options, selected, onChange }) {
  const slots = ['q', 'w', 'e', 'passive'].filter(k => options[k]?.length);
  if (!slots.length) return null;
  // If no W/E, item is armor → rename Q to "Activa" and ★ to "Pasiva"
  const isArmor = !options.w?.length && !options.e?.length;
  const label = (k) => {
    if (isArmor) return k === 'q' ? 'ACTIVA' : 'PASIVA';
    return SLOT_LABELS[k];
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {slots.map(k => (
        <div key={k}>
          <div style={{ fontSize: '0.6rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            {label(k)}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {options[k].map(spell => {
              const isActive = selected[k]?.uniquename === spell.uniquename;
              return (
                <div
                  key={spell.uniquename}
                  onClick={() => onChange(prev => ({ ...prev, [k]: spell }))}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 7,
                    padding: 2,
                    border: `2px solid ${isActive ? '#00d4ff' : 'transparent'}`,
                    background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
                    boxShadow: isActive ? '0 0 8px rgba(0,212,255,0.4)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <SpellIcon spell={spell} slot={k} size={34} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemPreview({ item, tier, enchant = 0 }) {
  const [ok, setOk] = useState(true);
  const url = item ? itemUrl(item.id, tier) : null;
  const glowColor = ENCHANT_COLORS[enchant] || null;

  useEffect(() => setOk(true), [url]);

  if (!item) return (
    <div style={{ width: 76, height: 76, background: 'rgba(255,255,255,0.03)', border: '1px dashed #2a2a3a', borderRadius: 10 }} />
  );

  return (
    <div style={{
      width: 76, height: 76,
      background: '#0a0a14',
      border: `2px solid ${glowColor || '#00d4ff44'}`,
      borderRadius: 10, overflow: 'hidden',
      boxShadow: glowColor
        ? `0 0 14px 4px ${glowColor}66, 0 0 32px 8px ${glowColor}22`
        : 'none',
      transition: 'box-shadow 0.25s, border-color 0.25s',
    }}>
      {ok
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setOk(false)} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4a6a', fontSize: '1.2rem' }}>?</div>
      }
    </div>
  );
}

export default function ItemPicker({ slot, slotLabel, onSelect, onClose }) {
  const [query, setQuery]       = useState('');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [tier, setTier]         = useState(8);
  const [enchant, setEnchant]   = useState(0);
  const [spellOptions, setSpellOptions]   = useState(null);  // { q:[], w:[], e:[], passive:[] }
  const [selectedSpells, setSelectedSpells] = useState({});   // { q: spellObj|null, ... }
  const [spellsLoading, setSpellsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const noEnchant = NO_ENCHANT.has(slot);

  // Available tiers/enchants for the currently selected item
  const availTiers   = selected?.tiers?.length   ? selected.tiers   : TIERS;
  const availEnchants = selected?.enchants?.length ? selected.enchants : [];

  const search = useCallback(async (q) => {
    setLoading(true);
    try {
      const results = await api.searchItems(slot, q);
      setItems(results);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [slot]);

  useEffect(() => {
    search('');
    inputRef.current?.focus();
  }, []);

  const handleQuery = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelectItem = async (item) => {
    setSelected(item);
    setSpellOptions(null);
    setSelectedSpells({});
    const tiers = item.tiers?.length ? item.tiers : TIERS;
    setTier(Math.max(...tiers));
    setEnchant(0);
    if (!NO_ENCHANT.has(slot)) {
      setSpellsLoading(true);
      try {
        const opts = await api.getItemSpells(item.id);
        const hasAny = opts && ['q','w','e','passive'].some(k => opts[k]?.length);
        if (hasAny) {
          setSpellOptions(opts);
          // Auto-select first option of each slot
          const auto = {};
          for (const k of ['q','w','e','passive']) {
            if (opts[k]?.length) auto[k] = opts[k][0];
          }
          setSelectedSpells(auto);
        }
      } catch { /* ignore */ }
      finally { setSpellsLoading(false); }
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    const spells = Object.values(selectedSpells).some(Boolean) ? selectedSpells : undefined;
    onSelect({ id: selected.id, name: selected.name, code: buildCode(selected.id, tier, enchant), spells });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f0f1e',
          border: '1px solid #00d4ff33',
          borderRadius: 14,
          width: '94vw',
          maxWidth: 820,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0,212,255,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #1a1a28', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: 'white', letterSpacing: '0.05em' }}>
              Seleccionar — <span style={{ color: '#00d4ff' }}>{slotLabel}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left — search + list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a28', minWidth: 0 }}>
            {/* Search */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a28', flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleQuery(e.target.value)}
                placeholder={`Buscar ${slotLabel.toLowerCase()}...`}
                style={{
                  width: '100%',
                  background: '#0a0a14',
                  border: '1px solid #00d4ff44',
                  borderRadius: 8,
                  padding: '9px 14px',
                  color: '#e0e0f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#5a5a7a', fontSize: '0.85rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 8px', width: 20, height: 20 }} />
                  Cargando items...
                </div>
              )}
              {!loading && items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#4a4a6a', fontSize: '0.85rem' }}>
                  Sin resultados para "{query}"
                </div>
              )}
              {!loading && items.map(item => {
                const isSelected = selected?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? 'rgba(0,212,255,0.1)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
                      marginBottom: 3, transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Icon preview at lowest available tier */}
                    <div style={{ width: 38, height: 38, background: '#0a0a14', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #1e1e30' }}>
                      <img
                        src={itemUrl(item.id, item.tiers?.length ? Math.min(...item.tiers) : 4)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', color: isSelected ? '#00d4ff' : '#e0e0f0', fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#4a4a6a', fontFamily: 'monospace' }}>{item.id}</div>
                    </div>
                    {isSelected && <div style={{ marginLeft: 'auto', color: '#00d4ff', flexShrink: 0 }}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — preview + tier + enchant + skills */}
          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            {/* Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <ItemPreview item={selected} tier={tier} enchant={enchant} />
              {selected && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: 'white' }}>{selected.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'monospace', marginTop: 2 }}>
                    {buildCode(selected.id, tier, enchant)}
                  </div>
                </div>
              )}
              {!selected && (
                <div style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', color: '#4a4a6a', textAlign: 'center' }}>
                  Seleccioná un item
                </div>
              )}
            </div>

            {/* Tier */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Tier</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {TIERS.map(t => {
                  const exists = availTiers.includes(t);
                  const active = tier === t;
                  return (
                    <button key={t}
                      onClick={() => exists && setTier(t)}
                      disabled={!exists}
                      title={!exists ? 'Este tier no existe para este item' : undefined}
                      style={{
                        flex: 1, padding: '5px 0', borderRadius: 6,
                        fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem',
                        transition: 'all 0.1s',
                        cursor: exists ? 'pointer' : 'not-allowed',
                        opacity: exists ? 1 : 0.25,
                        border: `1px solid ${active ? '#00d4ff66' : '#1e1e30'}`,
                        background: active ? 'rgba(0,212,255,0.15)' : 'transparent',
                        color: active ? '#00d4ff' : '#6a6a8a',
                      }}>T{t}</button>
                  );
                })}
              </div>
            </div>

            {/* Enchant */}
            {!noEnchant && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Encantamiento</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {ENCHANTS.map(e => {
                    const colors = ['#6a6a8a', '#4aee4a', '#5a5aff', '#cc44cc', '#ee8800'];
                    const col = colors[e];
                    const active = enchant === e;
                    // .0 always exists; .1-.4 only if item has them in its enchants array
                    const exists = e === 0 || !selected || availEnchants.includes(e);
                    return (
                      <button key={e}
                        onClick={() => exists && setEnchant(e)}
                        disabled={!exists}
                        title={!exists ? 'Este encantamiento no existe para este item' : undefined}
                        style={{
                          flex: 1, padding: '5px 0', borderRadius: 6,
                          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem',
                          transition: 'all 0.15s',
                          cursor: exists ? 'pointer' : 'not-allowed',
                          opacity: exists ? 1 : 0.2,
                          border: `1px solid ${active ? col : '#1e1e30'}`,
                          background: active ? col + '28' : 'transparent',
                          color: active ? col : '#4a4a6a',
                          boxShadow: active && e > 0 ? `0 0 8px 2px ${col}55` : 'none',
                        }}>.{e}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills selector */}
            {selected && (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Skills {spellsLoading && <span style={{ color: '#3a3a5a' }}>···</span>}
                </div>
                {spellOptions
                  ? <SpellSlotPicker options={spellOptions} selected={selectedSpells} onChange={setSelectedSpells} />
                  : !spellsLoading && <SkillsPanel baseId={selected.id} />
                }
              </div>
            )}

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={!selected}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em',
                cursor: selected ? 'pointer' : 'default',
                border: `1px solid ${selected ? '#00d4ff66' : '#1e1e30'}`,
                background: selected ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,100,180,0.15))' : 'transparent',
                color: selected ? '#00d4ff' : '#3a3a5a',
                transition: 'all 0.2s',
                marginTop: 'auto',
              }}
            >
              {selected ? `Confirmar — ${buildCode(selected.id, tier, enchant)}` : 'Seleccioná un item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
