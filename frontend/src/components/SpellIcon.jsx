import React, { useState, useEffect, useRef } from 'react';

const SLOT_META = {
  q:       { label: 'Q',  color: '#00d4ff' },
  w:       { label: 'W',  color: '#00e8c0' },
  e:       { label: 'E',  color: '#ff8c00' },
  passive: { label: '★',  color: '#ffaa00' },
};

function spellDisplayName(uniquename) {
  if (!uniquename) return '';
  return uniquename
    .split('_')
    .slice(-3)               // take last parts (strip weapon prefix)
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function SpellIcon({ spell, slot, size = 36, skillName }) {
  const [ok, setOk] = useState(true);
  const [showTip, setShowTip] = useState(false);
  const meta = SLOT_META[slot] || { label: slot?.toUpperCase(), color: '#888' };

  useEffect(() => setOk(true), [spell?.iconUrl]);

  const displayName = skillName || (spell ? spellDisplayName(spell.uniquename) : '');

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div style={{
        width: size, height: size, borderRadius: 6, overflow: 'hidden',
        background: '#0a0a14',
        border: `1px solid ${meta.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'default', flexShrink: 0,
      }}>
        {spell?.iconUrl && ok
          ? <img
              src={spell.iconUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setOk(false)}
            />
          : <span style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: size * 0.38, color: meta.color }}>
              {meta.label}
            </span>
        }
      </div>

      {/* Tooltip */}
      {showTip && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          background: '#0a0a14', border: `1px solid ${meta.color}44`,
          borderRadius: 7, padding: '5px 10px', zIndex: 500,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            fontFamily: 'Rajdhani', fontWeight: 800, fontSize: '0.65rem',
            color: meta.color, minWidth: 14, textAlign: 'center',
          }}>{meta.label}</span>
          <span style={{ fontSize: '0.75rem', color: '#e0e0f0' }}>{displayName || '—'}</span>
        </div>
      )}
    </div>
  );
}

// Row of Q W E Passive icons for one item
export function SpellRow({ spells, skillNames, size = 32, gap = 4 }) {
  if (!spells) return null;
  const slots = ['q', 'w', 'e', 'passive'].filter(s => spells[s]);
  if (!slots.length) return null;
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center', flexWrap: 'wrap' }}>
      {slots.map(s => (
        <SpellIcon
          key={s}
          spell={spells[s]}
          slot={s}
          size={size}
          skillName={skillNames?.[s]}
        />
      ))}
    </div>
  );
}
