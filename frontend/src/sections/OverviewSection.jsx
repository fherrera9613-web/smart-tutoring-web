import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const money = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  minimumFractionDigits: 2,
})

const compactNumber = new Intl.NumberFormat('es-NI', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const monthFormatter = new Intl.DateTimeFormat('es-NI', { month: 'short' })

function MetricIcon({ type }) {
  const paths = {
    estudiantes: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v2"/><path d="M17 11a4 4 0 0 1 4 4v2"/></>,
    tutores: <><circle cx="8" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 6-6"/><path d="m16 11 2 2 4-4"/></>,
    materias: <><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z"/><path d="M8 4v16"/><path d="M12 8h4"/></>,
    sesiones: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3M8 17h5"/></>,
    completadas: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    ingresos: <><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/><path d="m5 6 5-3 6 4 5-3"/></>,
    pendientes: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  }

  return (
    <svg className="metric-icon-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type] || paths.sesiones}
    </svg>
  )
}

function MetricCard({ label, value, hint, icon, tone = 'blue' }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-topline">
        <span className="metric-icon"><MetricIcon type={icon} /></span>
        <span className="metric-label">{label}</span>
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}

function HorizontalBarChart({ title, description, items, emptyMessage }) {
  const max = Math.max(...items.map((item) => item.value), 0)
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <article className="panel chart-card">
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        {total > 0 && <span className="chart-total">Total {total}</span>}
      </div>

      {items.length === 0 || max === 0 ? (
        <p className="muted chart-empty">{emptyMessage}</p>
      ) : (
        <div className="bar-chart" role="img" aria-label={title}>
          {items.map((item) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div className="bar-row" key={item.label} title={`${item.label}: ${item.value} (${percentage}%)`}>
                <div className="bar-label-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="bar-track" aria-hidden="true">
                  <div
                    className={`bar-fill ${item.variant ? `bar-fill-${item.variant}` : ''}`}
                    style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function MonthlyRevenueChart({ items }) {
  const max = Math.max(...items.map((item) => item.total), 0)
  const total = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <article className="panel chart-card chart-card-wide">
      <div className="chart-heading">
        <div>
          <h3>Ingresos registrados por mes</h3>
          <p className="muted">Evolución de los pagos registrados durante los últimos seis meses.</p>
        </div>
        <span className="chart-total">6 meses · {money.format(total)}</span>
      </div>

      {items.length === 0 ? (
        <p className="muted chart-empty">No hay información mensual disponible.</p>
      ) : (
        <div
          className="monthly-chart"
          role="img"
          aria-label="Ingresos registrados durante los últimos seis meses"
        >
          {items.map((item) => {
            const height = max === 0 ? 0 : (item.total / max) * 100
            return (
              <div className="monthly-column" key={`${item.anio}-${item.mes}`} title={`${item.label}: ${money.format(item.total)}`}>
                <span className="monthly-value">{compactNumber.format(item.total)}</span>
                <div className="monthly-track" aria-hidden="true">
                  <div
                    className="monthly-bar"
                    style={{ height: `${Math.max(height, item.total > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <span className="monthly-label">{item.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function buildMonthlyRevenue(items = []) {
  return items.map((item) => {
    const date = new Date(Number(item.anio), Number(item.mes) - 1, 1)
    const month = monthFormatter.format(date).replace('.', '')
    return {
      ...item,
      total: Number(item.total || 0),
      label: `${month.charAt(0).toUpperCase()}${month.slice(1)} ${String(item.anio).slice(-2)}`,
    }
  })
}

export default function OverviewSection({ session, onUnauthorized }) {
  const [metrics, setMetrics] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [chartData, setChartData] = useState({ estados: [], materias: [], ingresosPorMes: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setError('')
      try {
        if (session.rol === 'Tutor') {
          const sesiones = await api.sesiones.misSesiones()
          const hoy = getLocalIsoDate()
          if (active) {
            setMetrics({
              tutor: true,
              total: sesiones.length,
              programadas: sesiones.filter((item) => item.estado === 'Programada').length,
              hoy: sesiones.filter((item) => item.fecha === hoy).length,
              completadas: sesiones.filter((item) => item.estado === 'Completada').length,
            })
          }
          return
        }

        const [estudiantes, tutores, materias, sesiones, pagosResumen] = await Promise.all([
          api.estudiantes.listar(),
          api.tutores.listar(),
          api.materias.listar(),
          api.sesiones.listar(),
          api.pagos.resumen(),
        ])

        const hoy = getLocalIsoDate()
        const proximas = sesiones
          .filter((item) => item.estado === 'Programada' && item.fecha >= hoy)
          .sort((a, b) => `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`))
          .slice(0, 5)

        const estados = [
          { label: 'Programadas', value: sesiones.filter((item) => item.estado === 'Programada').length, variant: 'primary' },
          { label: 'Completadas', value: sesiones.filter((item) => item.estado === 'Completada').length, variant: 'success' },
          { label: 'Canceladas', value: sesiones.filter((item) => item.estado === 'Cancelada').length, variant: 'danger' },
        ]

        const materiaCounts = sesiones
          .filter((item) => item.estado !== 'Cancelada')
          .reduce((acc, item) => {
            const nombre = item.nombreMateria || 'Sin materia'
            acc.set(nombre, (acc.get(nombre) || 0) + 1)
            return acc
          }, new Map())

        const materiasDemandadas = [...materiaCounts.entries()]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
          .slice(0, 6)

        if (active) {
          setMetrics({
            tutor: false,
            estudiantes: estudiantes.length,
            tutores: tutores.length,
            materias: materias.length,
            programadas: estados[0].value,
            completadas: estados[1].value,
            ingresosTotales: pagosResumen.ingresosTotales,
            ingresosMesActual: pagosResumen.ingresosMesActual,
            pagosMesActual: pagosResumen.pagosMesActual,
            sesionesSinPago: pagosResumen.sesionesSinPago,
          })
          setUpcoming(proximas)
          setChartData({
            estados,
            materias: materiasDemandadas,
            ingresosPorMes: buildMonthlyRevenue(pagosResumen.ingresosPorMes),
          })
        }
      } catch (err) {
        if (active) setError(resolveErrorMessage(err, onUnauthorized))
      }
    }

    load()
    return () => { active = false }
  }, [session.rol, onUnauthorized])

  const hasAdministrativeCharts = useMemo(() => metrics && !metrics.tutor, [metrics])

  return (
    <div className="section-stack">
      <div className="section-heading dashboard-heading">
        <div>
          <p className="eyebrow">Panel general</p>
          <h2>Resumen operativo</h2>
          <p className="muted">Indicadores académicos y administrativos del centro de tutorías.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!metrics && !error && <div className="panel">Cargando información…</div>}

      {metrics?.tutor && (
        <div className="metrics-grid">
          <MetricCard label="Sesiones asignadas" value={metrics.total} icon="sesiones" tone="blue" />
          <MetricCard label="Programadas" value={metrics.programadas} icon="sesiones" tone="purple" />
          <MetricCard label="Sesiones de hoy" value={metrics.hoy} icon="pendientes" tone="amber" />
          <MetricCard label="Completadas" value={metrics.completadas} icon="completadas" tone="green" />
        </div>
      )}

      {metrics && !metrics.tutor && (
        <>
          <div className="metrics-grid">
            <MetricCard label="Estudiantes" value={metrics.estudiantes} icon="estudiantes" tone="blue" />
            <MetricCard label="Tutores" value={metrics.tutores} icon="tutores" tone="cyan" />
            <MetricCard label="Materias" value={metrics.materias} icon="materias" tone="purple" />
            <MetricCard label="Sesiones programadas" value={metrics.programadas} icon="sesiones" tone="amber" />
            <MetricCard label="Sesiones completadas" value={metrics.completadas} icon="completadas" tone="green" />
            <MetricCard label="Ingresos del mes" value={money.format(Number(metrics.ingresosMesActual || 0))} hint={`${metrics.pagosMesActual} pago(s) este mes`} icon="ingresos" tone="green" />
            <MetricCard label="Ingresos registrados" value={money.format(Number(metrics.ingresosTotales || 0))} icon="ingresos" tone="blue" />
            <MetricCard label="Sesiones sin pago" value={metrics.sesionesSinPago} hint="No canceladas" icon="pendientes" tone="red" />
          </div>

          {hasAdministrativeCharts && (
            <div className="dashboard-charts">
              <HorizontalBarChart title="Sesiones por estado" description="Distribución actual de las tutorías registradas." items={chartData.estados} emptyMessage="Aún no hay sesiones registradas." />
              <HorizontalBarChart title="Demanda por materia" description="Materias con más sesiones no canceladas." items={chartData.materias} emptyMessage="Aún no hay sesiones suficientes para medir demanda." />
              <MonthlyRevenueChart items={chartData.ingresosPorMes} />
            </div>
          )}

          <div className="panel table-panel">
            <div className="section-heading compact">
              <div>
                <h3>Próximas sesiones</h3>
                <p className="muted">Las siguientes tutorías programadas.</p>
              </div>
            </div>
            {upcoming.length === 0 ? (
              <p className="muted table-empty">No hay sesiones futuras programadas.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Tutor</th><th>Materia</th></tr></thead>
                  <tbody>
                    {upcoming.map((item) => (
                      <tr key={item.idSesion}>
                        <td>{item.fecha}</td>
                        <td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td>
                        <td>{item.nombreEstudiante}</td>
                        <td>{item.nombreTutor}</td>
                        <td>{item.nombreMateria}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel info-panel">
        <div className="info-panel-mark" aria-hidden="true">ST</div>
        <div>
          <h3>SMART Tutoring Center</h3>
          <p>El sistema centraliza la gestión académica y administrativa. Las opciones visibles dependen del rol autenticado y las operaciones protegidas son validadas nuevamente por la API.</p>
        </div>
      </div>
    </div>
  )
}
