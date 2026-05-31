import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Members from './pages/Members';
import Builds from './pages/Builds';
import Reequip from './pages/Reequip';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Killboard from './pages/Killboard';
import BattleDetail from './pages/BattleDetail';
import Ruleta from './pages/Ruleta';
import Casino from './pages/Casino';
import Apuestas from './pages/Apuestas';
import Games from './pages/Games';
import Meteoros from './pages/Meteoros';
import RuletaRusa from './pages/RuletaRusa';

function PendingScreen() {
  const { logout } = useAuth();
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>⏳</div>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '2rem', color: '#ffaa00', letterSpacing: '0.1em', marginBottom: 12 }}>
          CUENTA PENDIENTE
        </div>
        <div style={{ color: '#9090b0', fontSize: '1rem', lineHeight: 1.7, marginBottom: 24 }}>
          Tu cuenta está esperando aprobación de un administrador.<br />
          Una vez aprobada podrás acceder a todas las funciones del portal.
        </div>
        <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '14px 20px', marginBottom: 24, fontSize: '0.88rem', color: '#ffaa00' }}>
          💬 Avisale a un admin en el servidor de Discord para que te apruebe.
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid #1e1e30', color: '#6a6a8a', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.9rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div> Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'pending') return <PendingScreen />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'officer') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/members" element={<Members />} />
        <Route path="/builds" element={<Builds />} />
        <Route path="/reequip" element={<ProtectedRoute><Reequip /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/killboard" element={<Killboard />} />
        <Route path="/killboard/battles/:id" element={<BattleDetail />} />
        <Route path="/ruleta" element={<Ruleta />} />
        <Route path="/casino" element={<ProtectedRoute><Casino /></ProtectedRoute>} />
        <Route path="/apuestas" element={<Apuestas />} />
        <Route path="/juegos" element={<Games />} />
        <Route path="/meteoros" element={<Meteoros />} />
        <Route path="/ruleta-rusa" element={<RuletaRusa />} />
      </Routes>
      <footer style={{ borderTop: '1px solid #1e1e30', padding: '20px', textAlign: 'center', color: '#4a4a6a', fontSize: '0.82rem', fontFamily: 'Rajdhani', letterSpacing: '0.05em' }}>
        ANT1GRAVITY © 2026
      </footer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
