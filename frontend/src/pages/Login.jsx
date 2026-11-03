import { useState } from 'react'
import { api, ApiError } from '../services/api.js'
import smartTutoringLogo from '../assets/smart-tutoring-logo.svg'

function ThemeIcon({ theme }) {
  return theme === 'dark' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>
    </svg>
  )
}

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [correoElectronico, setCorreoElectronico] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const correo = correoElectronico.trim()
    if (!correo || !password) {
      setError('Ingrese su correo electrónico y contraseña.')
      return
    }

    setLoading(true)

    try {
      const session = await api.login(correo, password)
      onLogin(session)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('No fue posible iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <button
          type="button"
          className="theme-toggle login-theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          <ThemeIcon theme={theme} />
        </button>

        <img className="brand-logo brand-logo-login" src={smartTutoringLogo} alt="Logo de SMART Tutoring Center" />
        <p className="eyebrow">SMART Tutoring Center</p>
        <h1 id="login-title">Acceso al sistema</h1>
        <p className="muted">
          Gestión académica y administrativa del centro de tutorías.
        </p>

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              value={correoElectronico}
              onChange={(event) => setCorreoElectronico(event.target.value)}
              placeholder="usuario@smarttutoring.local"
              disabled={loading}
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingrese su contraseña"
              disabled={loading}
            />
          </label>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <button className="button button-primary button-block" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}
