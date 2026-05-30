import React, { useState, useEffect } from 'react';

// Tailuge billiards — GPL-3.0, https://github.com/tailuge/billiards
// Embedded via iframe so the casino code remains separate (not a derivative work).
// Future: replace this URL with our own fork+deploy when we add customizations.
const POOL_URL = 'https://tailuge.github.io/billiards/dist/';

export default function Billiards({ user }) {
  const [iframeOk, setIframeOk] = useState(true);
  const [loading, setLoading]   = useState(true);

  // If the iframe doesn't load within 7s, show fallback
  useEffect(() => {
    const t = setTimeout(() => { if (loading) setIframeOk(false); }, 7000);
    return () => clearTimeout(t);
  }, [loading]);

  const openExternal = () => window.open(POOL_URL, '_blank', 'noopener,noreferrer');

  return (
    <div className="casino-roul-view">
      {/* ── LEFT PANEL ── */}
      <div className="casino-roul-panel">
        <div className="casino-roul-panel__title">🎱 Billar 3D PRO</div>

        <div style={{
          background:'rgba(111,255,125,0.06)',
          border:'1px solid rgba(111,255,125,0.25)',
          borderRadius:10, padding:'12px 14px',
        }}>
          <div style={{
            fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700,
            letterSpacing:'0.1em', color:'var(--c-accent2)',
            textTransform:'uppercase', marginBottom:8,
          }}>● Powered by tailuge</div>
          <div style={{ fontSize:11, color:'var(--c-text2)', lineHeight:1.6 }}>
            Física basada en papers académicos:
            <br/>· Stronge cushion model
            <br/>· Mathavan equations
            <br/>· Sliding & rolling dynamics
            <br/>· Backspin / sidespin reales
          </div>
        </div>

        <div style={{
          background:'var(--c-surface2)', borderRadius:10, padding:'12px 14px',
        }}>
          <div style={{
            fontSize:9, fontFamily:'Unbounded,system-ui', fontWeight:700,
            letterSpacing:'0.1em', color:'var(--c-text4)',
            textTransform:'uppercase', marginBottom:8,
          }}>Modos disponibles</div>
          <div style={{ fontSize:11, color:'var(--c-text3)', lineHeight:1.7 }}>
            🎱 8-Ball<br/>
            🟡 9-Ball<br/>
            🟦 Snooker<br/>
            ⚪ Three-cushion<br/>
            🤖 vs IA (Claw, TheFarJaw)<br/>
            👥 Multiplayer online
          </div>
        </div>

        <button
          onClick={openExternal}
          style={{
            width:'100%', padding:12, borderRadius:10,
            background:'rgba(255,45,122,0.08)',
            border:'1px solid rgba(255,45,122,0.35)',
            color:'#ff2d7a',
            fontFamily:'Unbounded,system-ui', fontWeight:700,
            fontSize:'0.7rem', letterSpacing:'0.06em',
            cursor:'pointer',
          }}
        >
          ↗ ABRIR PANTALLA COMPLETA
        </button>

        <div style={{
          fontSize:9, color:'var(--c-text4)', lineHeight:1.5,
          padding:'8px 0', textAlign:'center',
        }}>
          Licencia: GPL-3.0<br/>
          Código abierto en{' '}
          <a href="https://github.com/tailuge/billiards" target="_blank" rel="noopener noreferrer"
            style={{ color:'var(--c-accent2)' }}>github</a>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:'auto', paddingTop:20 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              flex:1, background:'none',
              border:'1px solid var(--c-line2)', borderRadius:8,
              padding:'8px 14px', cursor:'pointer',
              color:'var(--c-text3)',
              fontFamily:'Inter,system-ui', fontWeight:600, fontSize:'0.8rem',
            }}
          >
            ← Volver al casino
          </button>
        </div>
      </div>

      {/* ── IFRAME STAGE ── */}
      <div
        style={{
          position:'relative', width:'100%',
          aspectRatio:'16 / 10',
          minHeight:540, maxHeight:780,
          background:'#000',
          borderRadius:12, overflow:'hidden',
          border:'1px solid var(--c-line2)',
        }}
      >
        {iframeOk ? (
          <>
            <iframe
              src={POOL_URL}
              title="Billar Tailuge"
              onLoad={() => setLoading(false)}
              style={{
                position:'absolute', inset:0,
                width:'100%', height:'100%',
                border:'none', display:'block',
                background:'#000',
              }}
              allow="autoplay; fullscreen; gamepad; xr-spatial-tracking"
              referrerPolicy="no-referrer"
            />
            {loading && (
              <div style={{
                position:'absolute', inset:0,
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                color:'var(--c-text3)', gap:14,
                pointerEvents:'none',
              }}>
                <div style={{
                  fontSize:'2rem', animation:'spin 1.5s linear infinite',
                }}>🎱</div>
                <div style={{
                  fontFamily:'Unbounded,system-ui', fontSize:'0.7rem',
                  letterSpacing:'0.1em', textTransform:'uppercase',
                }}>Cargando billar profesional…</div>
                <div style={{ fontSize:10, color:'var(--c-text4)' }}>
                  Primer carga ~5s · Three.js + física real
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </>
        ) : (
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            color:'var(--c-text3)', gap:18, padding:30, textAlign:'center',
          }}>
            <div style={{ fontSize:'3rem', opacity:0.5 }}>🎱</div>
            <div style={{
              fontFamily:'Unbounded,system-ui', fontSize:'0.85rem',
              color:'var(--c-text2)', maxWidth:340, lineHeight:1.5,
            }}>
              El billar no pudo cargarse en este frame.
              <br/>Abrilo en pantalla completa:
            </div>
            <button
              onClick={openExternal}
              style={{
                padding:'12px 22px', borderRadius:10,
                background:'linear-gradient(135deg,#ff2d7a,#ff5f4b)',
                border:'none', color:'#fff',
                fontFamily:'Unbounded,system-ui', fontWeight:700,
                fontSize:'0.7rem', letterSpacing:'0.08em',
                cursor:'pointer',
              }}
            >
              ↗ JUGAR EN PESTAÑA NUEVA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
