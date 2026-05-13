import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Members from './pages/Members';
import Builds from './pages/Builds';
import Reequip from './pages/Reequip';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div> Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'officer') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
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
      <AppRoutes />
    </AuthProvider>
  );
}
