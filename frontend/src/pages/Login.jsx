import { useState } from 'react'
import { api, ApiError } from '../services/api.js'

export default function Login({ onLogin }) {
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
        <div className="brand-mark" aria-hidden="true">ST</div>
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
