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

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}

function HorizontalBarChart({ title, description, items, emptyMessage }) {
  const max = Math.max(...items.map((item) => item.value), 0)

  return (
    <article className="panel chart-card">
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
      </div>

      {items.length === 0 || max === 0 ? (
        <p className="muted chart-empty">{emptyMessage}</p>
      ) : (
        <div className="bar-chart" role="img" aria-label={title}>
          {items.map((item) => (
            <div className="bar-row" key={item.label}>
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
          ))}
        </div>
      )}
    </article>
  )
}

function MonthlyRevenueChart({ items }) {
  const max = Math.max(...items.map((item) => item.total), 0)

  return (
    <article className="panel chart-card chart-card-wide">
      <div className="chart-heading">
        <div>
          <h3>Ingresos registrados por mes</h3>
          <p className="muted">Evolución de los pagos registrados durante los últimos seis meses.</p>
        </div>
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
              <div className="monthly-column" key={`${item.anio}-${item.mes}`}>
                <span className="monthly-value" title={money.format(item.total)}>
                  {compactNumber.format(item.total)}
                </span>
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
          {
            label: 'Programadas',
            value: sesiones.filter((item) => item.estado === 'Programada').length,
            variant: 'primary',
          },
          {
            label: 'Completadas',
            value: sesiones.filter((item) => item.estado === 'Completada').length,
            variant: 'success',
          },
          {
            label: 'Canceladas',
            value: sesiones.filter((item) => item.estado === 'Cancelada').length,
            variant: 'danger',
          },
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
    return () => {
      active = false
    }
  }, [session.rol, onUnauthorized])

  const hasAdministrativeCharts = useMemo(
    () => metrics && !metrics.tutor,
    [metrics],
  )

  return (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h2>Resumen operativo</h2>
          <p className="muted">Indicadores académicos y administrativos del centro de tutorías.</p>
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
        <>
          <div className="metrics-grid">
            <MetricCard label="Estudiantes" value={metrics.estudiantes} />
            <MetricCard label="Tutores" value={metrics.tutores} />
            <MetricCard label="Materias" value={metrics.materias} />
            <MetricCard label="Sesiones programadas" value={metrics.programadas} />
            <MetricCard label="Sesiones completadas" value={metrics.completadas} />
            <MetricCard
              label="Ingresos del mes"
              value={money.format(Number(metrics.ingresosMesActual || 0))}
              hint={`${metrics.pagosMesActual} pago(s) este mes`}
            />
            <MetricCard
              label="Ingresos registrados"
              value={money.format(Number(metrics.ingresosTotales || 0))}
            />
            <MetricCard
              label="Sesiones sin pago"
              value={metrics.sesionesSinPago}
              hint="No canceladas"
            />
          </div>

          {hasAdministrativeCharts && (
            <div className="dashboard-charts">
              <HorizontalBarChart
                title="Sesiones por estado"
                description="Distribución actual de las tutorías registradas."
                items={chartData.estados}
                emptyMessage="Aún no hay sesiones registradas."
              />
              <HorizontalBarChart
                title="Demanda por materia"
                description="Materias con más sesiones no canceladas."
                items={chartData.materias}
                emptyMessage="Aún no hay sesiones suficientes para medir demanda."
              />
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
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Estudiante</th>
                      <th>Tutor</th>
                      <th>Materia</th>
                    </tr>
                  </thead>
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
        <h3>SMART Tutoring Center</h3>
        <p>
          El sistema centraliza la gestión académica y administrativa. Las opciones visibles dependen
          del rol autenticado y las operaciones protegidas son validadas nuevamente por la API.
        </p>
      </div>
    </div>
  )
}
