import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const money = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', minimumFractionDigits: 2 })
function MetricCard({ label, value, hint }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article> }

export default function OverviewSection({ session, onUnauthorized }) {
  const [metrics, setMetrics] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setError('')
      try {
        if (session.rol === 'Tutor') {
          const sesiones = await api.sesiones.misSesiones()
          const hoy = getLocalIsoDate()
          if (active) setMetrics({ tutor: true, total: sesiones.length, programadas: sesiones.filter((item) => item.estado === 'Programada').length, hoy: sesiones.filter((item) => item.fecha === hoy).length, completadas: sesiones.filter((item) => item.estado === 'Completada').length })
          return
        }

        const [estudiantes, tutores, materias, sesiones, pagosResumen] = await Promise.all([api.estudiantes.listar(), api.tutores.listar(), api.materias.listar(), api.sesiones.listar(), api.pagos.resumen()])
        const hoy = getLocalIsoDate()
        const proximas = sesiones.filter((item) => item.estado === 'Programada' && item.fecha >= hoy).sort((a, b) => `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`)).slice(0, 5)
        if (active) {
          setMetrics({ tutor: false, estudiantes: estudiantes.length, tutores: tutores.length, materias: materias.length, programadas: sesiones.filter((item) => item.estado === 'Programada').length, completadas: sesiones.filter((item) => item.estado === 'Completada').length, ingresosTotales: pagosResumen.ingresosTotales, ingresosMesActual: pagosResumen.ingresosMesActual, pagosMesActual: pagosResumen.pagosMesActual, sesionesSinPago: pagosResumen.sesionesSinPago })
          setUpcoming(proximas)
        }
      } catch (err) { if (active) setError(resolveErrorMessage(err, onUnauthorized)) }
    }
    load(); return () => { active = false }
  }, [session.rol, onUnauthorized])

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Resumen operativo</h2><p className="muted">Indicadores académicos y administrativos del centro de tutorías.</p></div></div>
      {error && <div className="alert alert-error">{error}</div>}
      {!metrics && !error && <div className="panel">Cargando información…</div>}
      {metrics?.tutor && <div className="metrics-grid"><MetricCard label="Sesiones asignadas" value={metrics.total} /><MetricCard label="Programadas" value={metrics.programadas} /><MetricCard label="Sesiones de hoy" value={metrics.hoy} /><MetricCard label="Completadas" value={metrics.completadas} /></div>}
      {metrics && !metrics.tutor && <><div className="metrics-grid"><MetricCard label="Estudiantes" value={metrics.estudiantes} /><MetricCard label="Tutores" value={metrics.tutores} /><MetricCard label="Materias" value={metrics.materias} /><MetricCard label="Sesiones programadas" value={metrics.programadas} /><MetricCard label="Sesiones completadas" value={metrics.completadas} /><MetricCard label="Ingresos del mes" value={money.format(Number(metrics.ingresosMesActual || 0))} hint={`${metrics.pagosMesActual} pago(s) este mes`} /><MetricCard label="Ingresos registrados" value={money.format(Number(metrics.ingresosTotales || 0))} /><MetricCard label="Sesiones sin pago" value={metrics.sesionesSinPago} hint="No canceladas" /></div><div className="panel table-panel"><div className="section-heading compact"><div><h3>Próximas sesiones</h3><p className="muted">Las siguientes tutorías programadas.</p></div></div>{upcoming.length === 0 ? <p className="muted">No hay sesiones futuras programadas.</p> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Tutor</th><th>Materia</th></tr></thead><tbody>{upcoming.map((item) => <tr key={item.idSesion}><td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.nombreEstudiante}</td><td>{item.nombreTutor}</td><td>{item.nombreMateria}</td></tr>)}</tbody></table></div>}</div></>}
      <div className="panel info-panel"><h3>SMART Tutoring Center</h3><p>El sistema centraliza la gestión académica y administrativa. Las opciones visibles dependen del rol autenticado y las operaciones protegidas son validadas nuevamente por la API.</p></div>
    </div>
  )
}
