import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { clearSession, getUserRole, readSession, saveSession } from './services/api.js';
import './styles/global.css';

function App() {
  const [session, setSession] = useState(() => readSession());
  const handleLogin = (nextSession) => { saveSession(nextSession); setSession(nextSession); };
  const handleLogout = useCallback(() => { clearSession(); setSession(null); }, []);
  if (!session) return <Login onLogin={handleLogin} />;
  const role = getUserRole(session);
  if (!['admin', 'staff', 'tutor'].includes(role)) return <main className="login-wrap"><section className="card login-card"><div className="brand-mark">S</div><p className="eyebrow-plain">SMART Tutoring Center</p><h1>Rol sin acceso</h1><p className="lead">La API autenticó la cuenta, pero el token no contiene un rol reconocido para esta aplicación.</p><button className="button button-primary" onClick={handleLogout}>Cerrar sesión</button></section></main>;
  return <Dashboard key={role} session={session} role={role} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
