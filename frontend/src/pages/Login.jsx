import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setDone(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const er = {};
    if (!form.email.trim()) er.email = 'Ingresa tu correo institucional.';
    else if (!EMAIL_RE.test(form.email.trim())) er.email = 'El correo no tiene un formato válido.';
    if (!form.password) er.password = 'Ingresa tu contraseña.';
    else if (form.password.length < 6) er.password = 'La contraseña debe tener al menos 6 caracteres.';
    setErrors(er);
    if (Object.keys(er).length) return;

    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin?.(); }, 450);
  };

  return (
    <>
      <main className="login-wrap">
        <form className="card login-card" onSubmit={onSubmit} noValidate>
          <div className="brand-mark">S</div>
          <p className="eyebrow-plain">SMART Tutoring Center</p>
          <h1>Panel administrativo</h1>
          <p className="lead">Inicia sesión para gestionar estudiantes, profesores, familias y tutorías.</p>

          {done && <div className="alert alert-ok" role="status">Sesión iniciada.</div>}

          <label className="field">
            <span>Correo electrónico</span>
            <input name="email" type="email" autoComplete="email" placeholder="nombre@uni.edu"
              value={form.email} onChange={onChange} aria-invalid={!!errors.email} />
            {errors.email && <em>{errors.email}</em>}
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className="password">
              <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={form.password} onChange={onChange} aria-invalid={!!errors.password} />
              <button type="button" className="link-btn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password && <em>{errors.password}</em>}
          </label>

          <div className="row-end"><a href="#" className="link-sm">¿Olvidaste tu contraseña?</a></div>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </main>
    </>
  );
}
