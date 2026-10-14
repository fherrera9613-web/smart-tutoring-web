import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}

export default function OverviewSection({ session, onUnauthorized }) {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setError('')

      try {
        if (session.rol === 'Tutor') {
          const sesiones = await api.sesiones.misSesiones()
          const hoy = new Date().toISOString().slice(0, 10)
          const programadas = sesiones.filter((item) => item.estado === 'Programada')
          const hoyCount = sesiones.filter((item) => item.fecha === hoy).length

          if (active) {
            setMetrics({
              tutor: true,
              total: sesiones.length,
              programadas: programadas.length,
              hoy: hoyCount,
              completadas: sesiones.filter((item) => item.estado === 'Completada').length,
            })
          }
          return
        }

        const [estudiantes, tutores, materias, sesiones] = await Promise.all([
          api.estudiantes.listar(),
          api.tutores.listar(),
          api.materias.listar(),
          api.sesiones.listar(),
        ])

        if (active) {
          setMetrics({
            tutor: false,
            estudiantes: estudiantes.length,
            tutores: tutores.length,
            materias: materias.length,
            programadas: sesiones.filter((item) => item.estado === 'Programada').length,
          })
        }
      } catch (err) {
        if (active) setError(resolveErrorMessage(err, onUnauthorized))
      }
    }

    load()
    return () => { active = false }
  }, [session.rol, onUnauthorized])

  return (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h2>Resumen operativo</h2>
          <p className="muted">Vista rápida de los procesos principales disponibles para su rol.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!metrics && !error && <div className="panel">Cargando información…</div>}

      {metrics?.tutor && (
        <div className="metrics-grid">
          <MetricCard label="Sesiones asignadas" value={metrics.total} />
          <MetricCard label="Programadas" value={metrics.programadas} />
          <MetricCard label="Sesiones de hoy" value={metrics.hoy} />
          <MetricCard label="Completadas" value={metrics.completadas} />
        </div>
      )}

      {metrics && !metrics.tutor && (
        <div className="metrics-grid">
          <MetricCard label="Estudiantes" value={metrics.estudiantes} />
          <MetricCard label="Tutores" value={metrics.tutores} />
          <MetricCard label="Materias" value={metrics.materias} />
          <MetricCard label="Sesiones programadas" value={metrics.programadas} />
        </div>
      )}

      <div className="panel info-panel">
        <h3>SMART Tutoring Center</h3>
        <p>
          El sistema centraliza la gestión académica y administrativa del centro de tutorías.
          Las opciones visibles dependen del rol autenticado y todas las operaciones protegidas
          son validadas nuevamente por la API.
        </p>
      </div>
    </div>
  )
}
