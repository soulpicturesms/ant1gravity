import React from 'react';

const PALO_ICON  = { Espadas: '⚔️', Bastos: '🏑', Copas: '🏆', Oros: '🌟' };
const PALO_COLOR = { Espadas: '#00d4ff', Bastos: '#00cc66', Copas: '#a78bfa', Oros: '#ffd700' };

function DemoCard({ num, palo }) {
  const col = PALO_COLOR[palo];
  return (
    <div style={{
      width: 60, height: 86, borderRadius: 8,
      background: 'linear-gradient(145deg,#ffffff,#f4f4f4)',
      border: '1px solid #d1d5db',
      boxShadow: '3px 5px 14px rgba(0,0,0,0.55)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3,
      flexShrink: 0,
    }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: '1.3rem', color: col }}>{num}</div>
      <div style={{ fontSize: '1rem' }}>{PALO_ICON[palo]}</div>
    </div>
  );
}

export default function Truco() {
  const previewHand = [
    { num: 1, palo: 'Espadas' },
    { num: 7, palo: 'Oros' },
    { num: 3, palo: 'Copas' },
  ];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
      {/* Preview cards */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
        {previewHand.map((c, i) => (
          <DemoCard key={i} num={c.num} palo={c.palo} />
        ))}
      </div>

      <div className="card" style={{ border: '1px solid rgba(0,232,192,0.25)', background: 'linear-gradient(135deg,rgba(0,232,192,0.05),#0a0a14)', padding: '32px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🀄</div>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.8rem', color: '#00e8c0', letterSpacing: '0.08em', marginBottom: 8 }}>TRUCO ARGENTINO</div>
        <div style={{ fontSize: '0.9rem', color: '#6a6a8a', lineHeight: 1.6, marginBottom: 20 }}>
          1v1 o 2v2 con mazo español · Truco / Envido / Mazo<br />
          El modo multijugador está en desarrollo para la plataforma.
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,232,192,0.08)', border: '1px solid rgba(0,232,192,0.25)', borderRadius: 20, padding: '8px 20px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd700', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#00e8c0', fontSize: '0.9rem', letterSpacing: '0.1em' }}>PRÓXIMAMENTE</span>
        </div>
      </div>
    </div>
  );
}
