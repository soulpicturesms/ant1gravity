import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const load = () => api.getPendingCount().then(d => setPendingCount(d.count || 0)).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/members', label: 'Miembros' },
    { to: '/builds', label: 'Builds' },
    { to: '/reequip', label: 'Reequipo', auth: true },
    { to: '/admin', label: 'Admin', admin: true },
  ];

  return (
    <nav style={{
      background: 'linear-gradient(to bottom, #0a0a12, #0f0f1a)',
      borderBottom: '1px solid #1e1e30',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 70, gap: 24 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <img
            src="/logo-icon.png"
            alt="ANT1GRAVITY"
            style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.5))' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none', width: 42, height: 42,
            background: 'linear-gradient(135deg, #00aacc, #0044aa)',
            borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: 'white',
            border: '2px solid #00d4ff44', boxShadow: '0 0 15px rgba(0,212,255,0.3)'
          }}>AG</div>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: 'white', letterSpacing: '0.1em' }}>
            ANT<span style={{ color: '#00d4ff' }}>1</span>GRAVITY
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }} className="desktop-nav">
          {navLinks.map(link => {
            if (link.auth && !user) return null;
            if (link.admin && !isAdmin) return null;
            return (
              <NavLink key={link.to} to={link.to} end={link.to === '/'}
                style={({ isActive }) => ({
                  padding: '6px 16px',
                  borderRadius: 6,
                  fontFamily: 'Rajdhani',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isActive ? '#00d4ff' : '#9090b0',
                  background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  position: 'relative',
                })}
                onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.08')) { e.currentTarget.style.color = '#e0e0f0'; } }}
                onMouseLeave={e => { }}
              >
                {link.label}
                {link.admin && pendingCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: '#ff3355', color: 'white', borderRadius: '50%', fontSize: '0.6rem', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, lineHeight: 1 }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {user ? (
            <>
              <Link to="/profile" className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: 'white', lineHeight: 1 }}>{user.username}</span>
                  <span style={{ fontSize: '0.72rem', color: '#ffd700' }}>⚡ {user.coins} coins</span>
                </div>
                <div className="avatar" style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #00aacc, #0044aa)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', overflow: 'hidden', border: '2px solid rgba(0,212,255,0.3)', flexShrink: 0 }}>
                  {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username[0].toUpperCase()}
                </div>
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm desktop-nav">Salir</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm desktop-nav">Ingresar</Link>
          )}
          {/* Hamburger */}
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
            <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: 'transform 0.2s' }} />
            <span style={{ opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        {navLinks.map(link => {
          if (link.auth && !user) return null;
          if (link.admin && !isAdmin) return null;
          return (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}
              style={({ isActive }) => ({ color: isActive ? '#00d4ff' : '#9090b0', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 24px', display: 'block', textDecoration: 'none', position: 'relative' })}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {link.admin && pendingCount > 0 && (
                <span style={{ marginLeft: 8, background: '#ff3355', color: 'white', borderRadius: 10, fontSize: '0.7rem', padding: '1px 6px', fontFamily: 'Rajdhani', fontWeight: 700 }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
              )}
            </NavLink>
          );
        })}
        <div className="mobile-divider" />
        {user ? (
          <>
            <NavLink to="/profile" style={{ color: '#9090b0', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
              <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00aacc, #0044aa)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani', fontWeight: 700, color: 'white', overflow: 'hidden', border: '2px solid rgba(0,212,255,0.3)', flexShrink: 0, fontSize: '0.85rem' }}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'white', lineHeight: 1 }}>{user.username}</div>
                <div style={{ fontSize: '0.72rem', color: '#ffd700' }}>⚡ {user.coins} coins</div>
              </div>
            </NavLink>
            <button className="mobile-link" onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff6688', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 24px', textAlign: 'left', width: '100%', cursor: 'pointer' }}>Salir</button>
          </>
        ) : (
          <NavLink to="/login" style={{ color: '#00d4ff', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '12px 24px', display: 'block', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Ingresar</NavLink>
        )}
      </div>
    </nav>
  );
}
