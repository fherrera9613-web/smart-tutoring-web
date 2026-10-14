import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

function createEmptyForm() {
  return {
    idEstudiante: '',
    horas: '1',
    fechaPago: getLocalIsoDate(),
    concepto: 'Tutoría académica',
    observaciones: '',
  }
}

function createEmptyFilters() {
  return {
    concepto: '',
    desde: '',
    hasta: '',
  }
}

const money = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  minimumFractionDigits: 2,
})

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function PagosSection({ onUnauthorized }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [tarifa, setTarifa] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())
  const [selectedStudent, setSelectedStudent] = useState('')
  const [pagos, setPagos] = useState([])
  const [filters, setFilters] = useState(() => createEmptyFilters())
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      api.estudiantes.listar(),
      api.pagos.tarifa(),
    ])
      .then(([studentList, rate]) => {
        setEstudiantes(studentList)
        setTarifa(rate)
      })
      .catch((err) => setError(resolveErrorMessage(err, onUnauthorized)))
  }, [])

  const montoCalculado = useMemo(() => {
    if (!tarifa) return 0
    const horas = Number(form.horas)
    if (!Number.isFinite(horas) || horas <= 0) return 0
    return Math.round(
      horas * Number(tarifa.tarifaCordobasPorHora) * 100,
    ) / 100
  }, [form.horas, tarifa])

  const total = useMemo(
    () => pagos.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [pagos],
  )

  const filteredPayments = useMemo(() => {
    const concepto = filters.concepto.trim().toLocaleLowerCase('es')

    return pagos.filter((item) => {
      const matchesConcept = !concepto ||
        (item.concepto || '').toLocaleLowerCase('es').includes(concepto)
      const matchesFrom = !filters.desde || item.fechaPago >= filters.desde
      const matchesTo = !filters.hasta || item.fechaPago <= filters.hasta
      return matchesConcept && matchesFrom && matchesTo
    })
  }, [pagos, filters])

  const ultimoPago = pagos[0] ?? null

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateFilter(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  async function loadHistory(id) {
    if (!id) {
      setPagos([])
      return
    }
    setLoadingHistory(true)
    setError('')
    try {
      setPagos(await api.pagos.porEstudiante(Number(id)))
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.pagos.crear({
        idEstudiante: Number(form.idEstudiante),
        horas: Number(form.horas),
        fechaPago: form.fechaPago,
        concepto: form.concepto || null,
        observaciones: form.observaciones || null,
      })

      setSuccess(`Pago registrado correctamente por ${money.format(montoCalculado)}.`)
      const id = form.idEstudiante
      setForm({ ...createEmptyForm(), idEstudiante: id })
      setSelectedStudent(id)
      setFilters(createEmptyFilters())
      await loadHistory(id)
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setSaving(false)
    }
  }

  function handleHistoryStudent(event) {
    const id = event.target.value
    setSelectedStudent(id)
    setFilters(createEmptyFilters())
    loadHistory(id)
  }

  return (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h2>Pagos</h2>
          <p className="muted">Registro administrativo de pagos e historial por estudiante.</p>
        </div>
      </div>

      {tarifa && (
        <div className="panel note-panel">
          <strong>Tarifa de tutoría vigente:</strong>{' '}
          {usd.format(Number(tarifa.tarifaUsdPorHora))} por hora × tipo de cambio oficial{' '}
          C${Number(tarifa.tipoCambioCordobasPorUsd).toFixed(4)} ={' '}
          <strong>{money.format(Number(tarifa.tarifaCordobasPorHora))} por hora</strong>.
        </div>
      )}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          Estudiante
          <select name="idEstudiante" value={form.idEstudiante} onChange={updateField} required>
            <option value="">Seleccione</option>
            {estudiantes.map((item) => (
              <option key={item.idEstudiante} value={item.idEstudiante}>
                {item.nombre} {item.apellido} — {item.carnet}
              </option>
            ))}
          </select>
        </label>

        <label>
          Horas a pagar
          <input
            type="number"
            min="0.25"
            step="0.25"
            name="horas"
            value={form.horas}
            onChange={updateField}
            required
          />
        </label>

        <label>
          Monto calculado
          <input value={money.format(montoCalculado)} readOnly aria-readonly="true" />
        </label>

        <label>
          Fecha de pago
          <input type="date" name="fechaPago" value={form.fechaPago} onChange={updateField} required />
        </label>

        <label>
          Concepto
          <input
            name="concepto"
            value={form.concepto}
            onChange={updateField}
            maxLength="150"
            placeholder="Ej. Tutoría académica"
          />
        </label>

        <label>
          Observaciones
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={updateField}
            rows="3"
            maxLength="500"
          />
        </label>

        <div className="form-actions span-2">
          <button className="button button-primary" type="submit" disabled={saving || !tarifa || montoCalculado <= 0}>
            {saving ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <div className="section-heading compact">
          <div>
            <h3>Historial de pagos</h3>
            <p className="muted">Seleccione un estudiante para consultar sus pagos registrados.</p>
          </div>
          <select value={selectedStudent} onChange={handleHistoryStudent}>
            <option value="">Seleccione estudiante</option>
            {estudiantes.map((item) => (
              <option key={item.idEstudiante} value={item.idEstudiante}>
                {item.nombre} {item.apellido}
              </option>
            ))}
          </select>
        </div>

        {loadingHistory ? (
          <p>Cargando historial…</p>
        ) : selectedStudent && pagos.length === 0 ? (
          <p className="muted">No hay pagos registrados para este estudiante.</p>
        ) : pagos.length > 0 ? (
          <>
            <div className="metrics-grid payment-metrics">
              <div className="metric-card">
                <span>Total pagado</span>
                <strong>{money.format(total)}</strong>
                <small>Historial completo del estudiante</small>
              </div>
              <div className="metric-card">
                <span>Cantidad de pagos</span>
                <strong>{pagos.length}</strong>
                <small>Registros encontrados</small>
              </div>
              <div className="metric-card">
                <span>Último pago</span>
                <strong>{ultimoPago ? money.format(Number(ultimoPago.monto)) : '—'}</strong>
                <small>{ultimoPago ? formatDate(ultimoPago.fechaPago) : 'Sin registros'}</small>
              </div>
            </div>

            <div className="inline-form payment-filters">
              <label>
                Buscar concepto
                <input
                  name="concepto"
                  value={filters.concepto}
                  onChange={updateFilter}
                  placeholder="Ej. Tutoría"
                />
              </label>
              <label>
                Desde
                <input type="date" name="desde" value={filters.desde} onChange={updateFilter} />
              </label>
              <label>
                Hasta
                <input type="date" name="hasta" value={filters.hasta} onChange={updateFilter} />
              </label>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setFilters(createEmptyFilters())}
              >
                Limpiar filtros
              </button>
            </div>

            <p className="muted">
              Mostrando {filteredPayments.length} de {pagos.length} pago(s).
            </p>

            {filteredPayments.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pago</th>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((item) => (
                      <tr key={item.idPago}>
                        <td>#{String(item.idPago).padStart(4, '0')}</td>
                        <td>{formatDate(item.fechaPago)}</td>
                        <td>{item.concepto || '—'}</td>
                        <td>{money.format(Number(item.monto))}</td>
                        <td>{item.observaciones || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No hay pagos que coincidan con los filtros seleccionados.</p>
            )}
          </>
        ) : null}
      </div>

      <div className="panel note-panel">
        <strong>Alcance del piloto:</strong> este módulo registra pagos administrativos asociados al estudiante. No corresponde a facturación fiscal ni contabilidad completa.
      </div>
    </div>
  )
}
