import React from 'react';
import { Link } from 'react-router-dom';

const GAMES = [
  {
    to: '/marble',
    emoji: '🔮',
    title: 'MARBLE RACE',
    description: 'Canicas neón corren hacia la meta. ¿Quién llega primero?',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.06)',
    border: 'rgba(0,212,255,0.2)',
  },
  {
    to: '/coliseo',
    emoji: '⚔️',
    title: 'COLISEO',
    description: 'Gladiadores combaten en la arena hasta que queda uno en pie.',
    color: '#ffd700',
    bg: 'rgba(255,215,0,0.06)',
    border: 'rgba(255,215,0,0.2)',
  },
  {
    to: '/meteoros',
    emoji: '☄️',
    title: 'METEOROS',
    description: 'Lluvia de meteoros desde el espacio. Solo uno sobrevive.',
    color: '#ff6600',
    bg: 'rgba(255,102,0,0.06)',
    border: 'rgba(255,102,0,0.2)',
  },
  {
    to: '/ruleta-rusa',
    emoji: '🔫',
    title: 'RULETA RUSA',
    description: 'La aguja gira y elimina uno a uno. El último respira.',
    color: '#cc2222',
    bg: 'rgba(204,34,34,0.06)',
    border: 'rgba(204,34,34,0.25)',
  },
];

export default function Games() {
  return (
    <div style={{ minHeight: '80vh', padding: '32px 20px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎮</div>
        <h1 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2.4rem', color: 'white', margin: 0, letterSpacing: '0.1em' }}>
          JUEGOS INTERACTIVOS
        </h1>
        <p style={{ color: '#6a6a8a', marginTop: 10, fontSize: '0.95rem' }}>
          Para Twitch — los espectadores se inscriben, el admin larga el juego, todos miran en vivo quién gana
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
        {GAMES.map(g => (
          <Link key={g.to} to={g.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: g.bg,
              border: `1px solid ${g.border}`,
              borderRadius: 14,
              padding: '24px 28px',
              transition: 'transform 0.15s, border-color 0.15s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = g.color; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = g.border; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: '2.2rem' }}>{g.emoji}</span>
                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: g.color, letterSpacing: '0.08em' }}>
                  {g.title}
                </span>
              </div>
              <p style={{ color: '#8080a0', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{g.description}</p>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.82rem', color: g.color, letterSpacing: '0.1em' }}>ENTRAR →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 36, padding: '16px 20px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 10, fontSize: '0.85rem', color: '#5a5a7a', lineHeight: 1.7 }}>
        <span style={{ color: '#4a8a9a', fontFamily: 'Rajdhani', fontWeight: 600 }}>¿Cómo funciona?</span>
        {' '}El admin crea una sesión, los espectadores de Twitch entran con su nombre, el admin inicia el juego y todos ven en tiempo real quién gana. El ganador se determina al azar al momento de iniciar.
      </div>
    </div>
  );
}
