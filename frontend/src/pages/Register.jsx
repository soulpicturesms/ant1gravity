import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const { token, user } = await api.register({ username: form.username, password: form.password });
      login(token, user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color: 'white', letterSpacing: '0.1em' }}>
            ANT<span style={{ color: '#00d4ff' }}>1</span>GRAVITY
          </div>
          <p style={{ color: '#6a6a8a', marginTop: 8 }}>Únete al portal del gremio</p>
        </div>

        <div className="card" style={{ boxShadow: '0 0 40px rgba(0,212,255,0.08)' }}>
          <h2 style={{ fontFamily: 'Rajdhani', fontSize: '1.4rem', fontWeight: 700, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>Crear Cuenta</h2>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre en Albion Online</label>
              <input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Tu IGN" required autoFocus />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <input className="input" type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repite la contraseña" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#6a6a8a', fontSize: '0.9rem' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#00d4ff' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
