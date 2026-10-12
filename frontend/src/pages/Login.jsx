import { useState } from 'react';
import { api, getSessionUser } from '../services/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setServerError('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const email = form.email.trim();
    if (!email) nextErrors.email = 'Ingresa tu correo.';
    else if (!EMAIL_RE.test(email)) nextErrors.email = 'El correo no tiene un formato válido.';
    if (!form.password) nextErrors.password = 'Ingresa tu contraseña.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (import.meta.env.DEV && email.toLowerCase() === 'admin@correo.com' && form.password === '1234') {
      onLogin({
        token: 'local-demo-session',
        demo: true,
        role: 'admin',
        user: { nombre: 'Admin de prueba', correo: 'admin@correo.com', rol: 'admin' },
      });
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      const response = await api.login(email, form.password);
      onLogin(getSessionUser(response));
    } catch (error) {
      setServerError(error.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="login-wrap">
    <form className="card login-card" onSubmit={onSubmit} noValidate>
      <div className="brand-mark">S</div>
      <p className="eyebrow-plain">SMART Tutoring Center</p>
      <h1>Iniciar sesión</h1>
      <p className="lead">Usa tu cuenta del sistema. El acceso y los permisos se validan en el servidor.</p>
      {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}
      <label className="field"><span>Correo electrónico</span><input name="email" type="email" autoComplete="username" placeholder="nombre@correo.com" value={form.email} onChange={onChange} aria-invalid={!!errors.email}/>{errors.email && <em>{errors.email}</em>}</label>
      <label className="field"><span>Contraseña</span><div className="password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={onChange} aria-invalid={!!errors.password}/><button type="button" className="link-btn" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>{errors.password && <em>{errors.password}</em>}</label>
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Validando con el servidor…' : 'Iniciar sesión'}</button>
      <p className="login-footnote">La autenticación requiere la API configurada.</p>
    </form>
  </main>;
}
