import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

function createEmptyForm() {
  return {
    idEstudiante: '',
    monto: '',
    fechaPago: getLocalIsoDate(),
    concepto: '',
    observaciones: '',
  }
}

const money = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  minimumFractionDigits: 2,
})

export default function PagosSection({ onUnauthorized }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [form, setForm] = useState(() => createEmptyForm())
  const [selectedStudent, setSelectedStudent] = useState('')
  const [pagos, setPagos] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.estudiantes.listar()
      .then(setEstudiantes)
      .catch((err) => setError(resolveErrorMessage(err, onUnauthorized)))
  }, [])

  const total = useMemo(
    () => pagos.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [pagos],
  )

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
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
        monto: Number(form.monto),
        fechaPago: form.fechaPago,
        concepto: form.concepto || null,
        observaciones: form.observaciones || null,
      })

      setSuccess('Pago registrado correctamente.')
      const id = form.idEstudiante
      setForm({ ...createEmptyForm(), idEstudiante: id })
      setSelectedStudent(id)
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
    loadHistory(id)
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Pagos</h2><p className="muted">Registro administrativo de pagos e historial por estudiante.</p></div></div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Estudiante<select name="idEstudiante" value={form.idEstudiante} onChange={updateField} required><option value="">Seleccione</option>{estudiantes.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{item.nombre} {item.apellido} — {item.carnet}</option>)}</select></label>
        <label>Monto (C$)<input type="number" min="0.01" step="0.01" name="monto" value={form.monto} onChange={updateField} required /></label>
        <label>Fecha de pago<input type="date" name="fechaPago" value={form.fechaPago} onChange={updateField} required /></label>
        <label>Concepto<input name="concepto" value={form.concepto} onChange={updateField} maxLength="150" placeholder="Ej. Mensualidad octubre" /></label>
        <label className="span-2">Observaciones<textarea name="observaciones" value={form.observaciones} onChange={updateField} rows="3" maxLength="500" /></label>
        <div className="form-actions span-2"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar pago'}</button></div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <div className="section-heading compact">
          <div><h3>Historial de pagos</h3><p className="muted">Seleccione un estudiante para consultar sus pagos registrados.</p></div>
          <select value={selectedStudent} onChange={handleHistoryStudent}><option value="">Seleccione estudiante</option>{estudiantes.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{item.nombre} {item.apellido}</option>)}</select>
        </div>

        {loadingHistory ? <p>Cargando historial…</p> : selectedStudent && pagos.length === 0 ? <p className="muted">No hay pagos registrados para este estudiante.</p> : pagos.length > 0 ? (
          <>
            <div className="payment-summary"><span>Total registrado en el historial consultado</span><strong>{money.format(total)}</strong></div>
            <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Observaciones</th></tr></thead><tbody>
              {pagos.map((item) => <tr key={item.idPago}><td>{item.fechaPago}</td><td>{item.concepto || '—'}</td><td>{money.format(Number(item.monto))}</td><td>{item.observaciones || '—'}</td></tr>)}
            </tbody></table></div>
          </>
        ) : null}
      </div>

      <div className="panel note-panel"><strong>Alcance del piloto:</strong> este módulo registra pagos administrativos asociados al estudiante. No corresponde a facturación fiscal ni contabilidad completa.</div>
    </div>
  )
}
