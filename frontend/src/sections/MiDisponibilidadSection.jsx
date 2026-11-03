import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import DisponibilidadEditor from '../components/DisponibilidadEditor.jsx'
import { resolveErrorMessage } from '../utils/errors.js'

export default function MiDisponibilidadSection({ onUnauthorized }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.tutores.miPerfil()
      .then((value) => { if (active) setProfile(value) })
      .catch((err) => { if (active) setError(resolveErrorMessage(err, onUnauthorized)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onUnauthorized])

  return <div className="section-stack">
    <div className="section-heading">
      <div>
        <h2>Mi disponibilidad</h2>
        <p className="muted">Gestiona tu jornada semanal y registra las ausencias que afectan tus horas disponibles para impartir tutorías.</p>
      </div>
    </div>
    {loading ? <div className="panel">Cargando tu perfil…</div> : error ? <div className="alert alert-error" role="alert">{error}</div> :
      profile && <DisponibilidadEditor idTutor={profile.idTutor} onUnauthorized={onUnauthorized} title={`Disponibilidad de ${profile.nombre} ${profile.apellido}`} />}
  </div>
}
