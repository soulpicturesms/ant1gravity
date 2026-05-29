import React, { useState, useEffect } from 'react';

/**
 * Componente para mostrar el avatar de Albion Online con su ring.
 * 
 * No existe un CDN público oficial de Albion para avatares/rings de perfil.
 * Este componente intenta cargar desde assets locales (/albion-assets/avatars/ y /albion-assets/rings/)
 * y si no existen, muestra un avatar generado estilizado.
 * 
 * Para que funcione con imágenes reales, hay que:
 * 1. Extraer los sprites del cliente del juego (AssetStudio)
 * 2. Colocarlos en public/albion-assets/avatars/{AVATAR_ID}.png
 * 3. Colocarlos en public/albion-assets/rings/{RING_ID}.png
 */

// Mapeo de colores según el tipo de avatar (para el fallback generado)
const AVATAR_COLORS = {
  'AVATAR_FAMERANK': ['#ffd700', '#ff8c00'],     // Dorado - por fama
  'AVATAR_SEASON': ['#00d4ff', '#0066ff'],        // Azul - de temporada
  'AVATAR_PREMIUM': ['#ff3366', '#cc0044'],       // Rojo premium
  'AVATAR_HALLOWEEN': ['#ff6600', '#8b0000'],     // Naranja halloween
  'AVATAR_CHRISTMAS': ['#ff0000', '#006400'],      // Navidad
  'AVATAR_VANITY': ['#9b59b6', '#6c3483'],        // Púrpura vanity
  'DEFAULT': ['#00aacc', '#0044aa'],              // Default azul
};

const RING_BORDER_COLORS = {
  'RING_FAMERANK': '#ffd700',
  'RING_SEASON': '#00d4ff',
  'RING_PREMIUM': '#ff3366',
  'RING1': '#c0c0c0',
  'RING2': '#ffd700',
  'RING3': '#00d4ff',
  'DEFAULT': 'rgba(0,212,255,0.3)',
};

function getAvatarColors(avatarId) {
  if (!avatarId) return AVATAR_COLORS.DEFAULT;
  const prefix = Object.keys(AVATAR_COLORS).find(k => k !== 'DEFAULT' && avatarId.toUpperCase().startsWith(k));
  return AVATAR_COLORS[prefix] || AVATAR_COLORS.DEFAULT;
}

function getRingColor(ringId) {
  if (!ringId) return RING_BORDER_COLORS.DEFAULT;
  const key = Object.keys(RING_BORDER_COLORS).find(k => k !== 'DEFAULT' && ringId.toUpperCase().startsWith(k));
  return RING_BORDER_COLORS[key] || RING_BORDER_COLORS[ringId] || RING_BORDER_COLORS.DEFAULT;
}

// Genera un ícono SVG basado en el ID del avatar
function generateAvatarSvg(avatarId, size) {
  const colors = getAvatarColors(avatarId);
  // Extraer un "número" del ID para variar el diseño
  const num = (avatarId || '').replace(/\D/g, '') || '0';
  const seed = parseInt(num) || 0;
  
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ borderRadius: '50%' }}>
      <defs>
        <linearGradient id={`grad-${avatarId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
        <radialGradient id={`glow-${avatarId}`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#grad-${avatarId})`} />
      <circle cx="50" cy="50" r="50" fill={`url(#glow-${avatarId})`} />
      {/* Silueta estilizada de guerrero */}
      <g opacity="0.9" fill="white">
        {/* Cabeza */}
        <circle cx="50" cy="32" r="12" />
        {/* Cuerpo */}
        <path d="M 35 45 Q 50 42 65 45 L 68 75 Q 50 78 32 75 Z" />
        {/* Hombros */}
        <rect x="28" y="44" width="10" height="6" rx="3" />
        <rect x="62" y="44" width="10" height="6" rx="3" />
        {/* Detalle de casco basado en seed */}
        {seed % 3 === 0 && <path d="M 38 25 L 50 15 L 62 25" fill="none" stroke="white" strokeWidth="2.5" />}
        {seed % 3 === 1 && <circle cx="50" cy="20" r="4" />}
        {seed % 3 === 2 && <rect x="44" y="18" width="12" height="4" rx="2" />}
      </g>
      {/* Número de rango como decoración */}
      <text x="50" y="90" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="sans-serif" fontWeight="700">
        ★
      </text>
    </svg>
  );
}

export default function AlbionAvatar({ avatarId, ringId, size = 80, characterName = '' }) {
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [ringIndex, setRingIndex] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [ringError, setRingError] = useState(false);

  // Reset indices and error flags if the avatarId or ringId changes
  useEffect(() => {
    setAvatarIndex(0);
    setAvatarError(false);
  }, [avatarId]);

  useEffect(() => {
    setRingIndex(0);
    setRingError(false);
  }, [ringId]);

  // Generate candidates for the avatar image URL
  const avatarCandidates = [];
  if (avatarId) {
    const aUpper = avatarId.toUpperCase();
    if (!aUpper.startsWith('HUMAN_')) {
      avatarCandidates.push(`/albion-assets/avatars/HUMAN_MALE_${aUpper}.png`);
      avatarCandidates.push(`/albion-assets/avatars/HUMAN_FEMALE_${aUpper}.png`);
    }
    avatarCandidates.push(`/albion-assets/avatars/${avatarId}.png`);
    avatarCandidates.push(`/albion-assets/avatars/${avatarId.toLowerCase()}.png`);
  }
  const uniqueAvatarUrls = [...new Set(avatarCandidates.filter(Boolean))];

  // Generate candidates for the avatar ring image URL
  const ringCandidates = [];
  if (ringId) {
    const rUpper = ringId.toUpperCase();
    ringCandidates.push(`/albion-assets/rings/${ringId}.png`);
    ringCandidates.push(`/albion-assets/rings/${rUpper}.png`);
    if (!rUpper.startsWith('AVATARRING_')) {
      ringCandidates.push(`/albion-assets/rings/AVATARRING_${rUpper}.png`);
    }
    if (rUpper.startsWith('RING_') && !rUpper.startsWith('RING_MOB')) {
      ringCandidates.push(`/albion-assets/rings/AVATARRING_${rUpper.replace('RING_', '')}.png`);
    }
    if (!rUpper.startsWith('RING') && !rUpper.startsWith('AVATARRING')) {
      ringCandidates.push(`/albion-assets/rings/RING_${rUpper}.png`);
    }
    ringCandidates.push(`/albion-assets/rings/${ringId.toLowerCase()}.png`);
  }
  const uniqueRingUrls = [...new Set(ringCandidates.filter(Boolean))];

  const ringColor = getRingColor(ringId);
  const ringWidth = Math.max(3, Math.round(size * 0.04));
  const ringGlow = ringId ? `0 0 ${Math.round(size * 0.15)}px ${ringColor}40` : 'none';

  const handleAvatarError = () => {
    if (avatarIndex < uniqueAvatarUrls.length - 1) {
      setAvatarIndex(prev => prev + 1);
    } else {
      setAvatarError(true);
    }
  };

  const handleRingError = () => {
    if (ringIndex < uniqueRingUrls.length - 1) {
      setRingIndex(prev => prev + 1);
    } else {
      setRingError(true);
    }
  };

  // Si tenemos avatar de Albion
  if (avatarId) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {/* Contenedor del avatar */}
        <div style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '50%', 
          background: '#0f0f18', 
          overflow: 'hidden',
          position: 'relative',
          border: `${ringWidth}px solid ${ringColor}`,
          boxShadow: ringGlow,
          boxSizing: 'border-box',
        }}>
          {!avatarError && uniqueAvatarUrls.length > 0 ? (
            <img 
              src={uniqueAvatarUrls[avatarIndex]}
              alt={characterName || avatarId} 
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={handleAvatarError}
            />
          ) : (
            generateAvatarSvg(avatarId, size - ringWidth * 2)
          )}
        </div>
        
        {/* Ring overlay (imagen real si existe) */}
        {ringId && !ringError && uniqueRingUrls.length > 0 && (
          <img 
            src={uniqueRingUrls[ringIndex]}
            alt="" 
            referrerPolicy="no-referrer"
            style={{ 
              position: 'absolute', 
              inset: -Math.round(size * 0.08), 
              width: `calc(100% + ${Math.round(size * 0.16)}px)`, 
              height: `calc(100% + ${Math.round(size * 0.16)}px)`, 
              zIndex: 2,
              pointerEvents: 'none'
            }} 
            onError={handleRingError}
          />
        )}
      </div>
    );
  }

  // Fallback: sin avatar de Albion
  return null;
}
