import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

function createEmptyForm() { return { idEstudiante: '', idSesion: '', fechaPago: getLocalIsoDate(), metodoPago: 'Efectivo', observaciones: '' } }
const money = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', minimumFractionDigits: 2 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
function formatDate(value) { if (!value) return '—'; const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
function sessionMinutes(session) { if (!session?.horaInicio || !session?.horaFin) return 0; const [sh, sm] = session.horaInicio.slice(0, 5).split(':').map(Number); const [eh, em] = session.horaFin.slice(0, 5).split(':').map(Number); return (eh * 60 + em) - (sh * 60 + sm) }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') }

export default function PagosSection({ onUnauthorized }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [todosPagos, setTodosPagos] = useState([])
  const [tarifa, setTarifa] = useState(null)
  const [form, setForm] = useState(() => createEmptyForm())
  const [selectedStudent, setSelectedStudent] = useState('')
  const [pagos, setPagos] = useState([])
  const [lastReceipt, setLastReceipt] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadBaseData() {
    const [studentList, sessionList, rate, paymentList] = await Promise.all([api.estudiantes.listar(), api.sesiones.listar(), api.pagos.tarifa(), api.pagos.listar()])
    setEstudiantes(studentList); setSesiones(sessionList); setTarifa(rate); setTodosPagos(paymentList)
  }
  useEffect(() => { loadBaseData().catch((err) => setError(resolveErrorMessage(err, onUnauthorized))) }, [])

  const paidSessionIds = useMemo(() => new Set(todosPagos.filter((item) => item.idSesion).map((item) => item.idSesion)), [todosPagos])
  const availableSessions = useMemo(() => !form.idEstudiante ? [] : sesiones.filter((item) => String(item.idEstudiante) === form.idEstudiante && item.estado !== 'Cancelada' && !paidSessionIds.has(item.idSesion)), [sesiones, form.idEstudiante, paidSessionIds])
  const selectedSession = useMemo(() => sesiones.find((item) => String(item.idSesion) === form.idSesion) || null, [sesiones, form.idSesion])
  const minutos = sessionMinutes(selectedSession)
  const montoCalculado = useMemo(() => !tarifa || minutos <= 0 ? 0 : Math.round((minutos / 60) * Number(tarifa.tarifaCordobasPorHora) * 100) / 100, [minutos, tarifa])
  const total = useMemo(() => pagos.reduce((sum, item) => sum + Number(item.monto || 0), 0), [pagos])

  function updateField(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value, ...(name === 'idEstudiante' ? { idSesion: '' } : {}) })) }

  async function loadHistory(id) {
    if (!id) { setPagos([]); return }
    setLoadingHistory(true); setError('')
    try { setPagos(await api.pagos.porEstudiante(Number(id))) }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setLoadingHistory(false) }
  }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const payment = await api.pagos.crear({ idSesion: Number(form.idSesion), fechaPago: form.fechaPago, metodoPago: form.metodoPago, observaciones: form.observaciones || null })
      setLastReceipt(payment); setSuccess(`Pago registrado correctamente por ${money.format(Number(payment.monto))}.`)
      const id = form.idEstudiante; setForm({ ...createEmptyForm(), idEstudiante: id }); setSelectedStudent(id)
      await Promise.all([loadBaseData(), loadHistory(id)])
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  function handleHistoryStudent(event) { const id = event.target.value; setSelectedStudent(id); loadHistory(id) }

  function printReceipt(payment) {
    const popup = window.open('', '_blank', 'width=700,height=800')
    if (!popup) { setError('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para imprimir el comprobante.'); return }
    popup.document.write(`<!doctype html><html><head><title>Comprobante #${payment.idPago}</title><style>body{font-family:Arial,sans-serif;max-width:620px;margin:40px auto;color:#222}h1{margin-bottom:4px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}.total{font-size:1.3rem;font-weight:700;margin-top:20px}.note{margin-top:28px;color:#555;font-size:.9rem}</style></head><body><h1>SMART Tutoring Center</h1><p>Comprobante de pago #${String(payment.idPago).padStart(4, '0')}</p><div class="row"><span>Estudiante</span><strong>${escapeHtml(payment.nombreEstudiante)}</strong></div><div class="row"><span>Materia</span><strong>${escapeHtml(payment.nombreMateria || 'Registro anterior')}</strong></div><div class="row"><span>Tutor</span><strong>${escapeHtml(payment.nombreTutor || '—')}</strong></div><div class="row"><span>Fecha de sesión</span><strong>${escapeHtml(formatDate(payment.fechaSesion))}</strong></div><div class="row"><span>Duración</span><strong>${payment.minutos ? `${payment.minutos} minutos` : '—'}</strong></div><div class="row"><span>Método de pago</span><strong>${escapeHtml(payment.metodoPago)}</strong></div><div class="row"><span>Fecha de pago</span><strong>${escapeHtml(formatDate(payment.fechaPago))}</strong></div><div class="total">Total: ${escapeHtml(money.format(Number(payment.monto)))}</div><p class="note">Comprobante administrativo. No constituye factura fiscal.</p><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Pagos</h2><p className="muted">Registro de pagos vinculados a tutorías reales y emisión de comprobantes administrativos.</p></div></div>
      {tarifa && <div className="panel note-panel"><strong>Tarifa vigente:</strong>{' '}{usd.format(Number(tarifa.tarifaUsdPorHora))} por hora × C${Number(tarifa.tipoCambioCordobasPorUsd).toFixed(4)} = <strong>{money.format(Number(tarifa.tarifaCordobasPorHora))} por hora</strong>.</div>}
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Estudiante<select name="idEstudiante" value={form.idEstudiante} onChange={updateField} required><option value="">Seleccione</option>{estudiantes.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{item.nombre} {item.apellido} — {item.carnet}</option>)}</select></label>
        <label>Sesión / materia a pagar<select name="idSesion" value={form.idSesion} onChange={updateField} required disabled={!form.idEstudiante}><option value="">{form.idEstudiante ? 'Seleccione una tutoría' : 'Seleccione primero un estudiante'}</option>{availableSessions.map((item) => <option key={item.idSesion} value={item.idSesion}>{item.nombreMateria} — {formatDate(item.fecha)} — {item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)} — {item.nombreTutor}</option>)}</select>{form.idEstudiante && availableSessions.length === 0 && <small className="muted">No hay tutorías pendientes de pago para este estudiante.</small>}</label>
        <label>Duración<input value={minutos ? `${minutos} minutos` : 'Seleccione una tutoría'} readOnly /></label>
        <label>Monto calculado<input value={money.format(montoCalculado)} readOnly /></label>
        <label>Método de pago<select name="metodoPago" value={form.metodoPago} onChange={updateField} required><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option></select></label>
        <label>Fecha de pago<input type="date" name="fechaPago" value={form.fechaPago} onChange={updateField} required max={getLocalIsoDate()} /></label>
        <label className="span-2">Observaciones<textarea name="observaciones" value={form.observaciones} onChange={updateField} rows="3" maxLength="500" /></label>
        <div className="form-actions span-2"><button className="button button-primary" type="submit" disabled={saving || !tarifa || !selectedSession || montoCalculado <= 0}>{saving ? 'Registrando…' : 'Registrar pago'}</button></div>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {lastReceipt && <div className="panel"><div className="section-heading compact"><div><h3>Comprobante #{String(lastReceipt.idPago).padStart(4, '0')}</h3><p className="muted">Pago registrado correctamente.</p></div><button className="button button-primary" type="button" onClick={() => printReceipt(lastReceipt)}>Imprimir comprobante</button></div><div className="metrics-grid payment-metrics"><div className="metric-card"><span>Estudiante</span><strong>{lastReceipt.nombreEstudiante}</strong><small>{lastReceipt.nombreMateria || 'Registro anterior'}</small></div><div className="metric-card"><span>Método</span><strong>{lastReceipt.metodoPago}</strong><small>{formatDate(lastReceipt.fechaPago)}</small></div><div className="metric-card"><span>Total</span><strong>{money.format(Number(lastReceipt.monto))}</strong><small>{lastReceipt.minutos ? `${lastReceipt.minutos} minutos` : '—'}</small></div></div></div>}
      <div className="panel"><div className="section-heading compact"><div><h3>Historial de pagos</h3><p className="muted">Consulte pagos y vuelva a emitir un comprobante.</p></div><select value={selectedStudent} onChange={handleHistoryStudent}><option value="">Seleccione estudiante</option>{estudiantes.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{item.nombre} {item.apellido}</option>)}</select></div>{loadingHistory ? <p>Cargando historial…</p> : selectedStudent && pagos.length === 0 ? <p className="muted">No hay pagos registrados para este estudiante.</p> : pagos.length > 0 ? <><div className="metrics-grid payment-metrics"><div className="metric-card"><span>Total pagado</span><strong>{money.format(total)}</strong><small>Historial del estudiante</small></div><div className="metric-card"><span>Cantidad de pagos</span><strong>{pagos.length}</strong><small>Registros encontrados</small></div></div><div className="table-wrap"><table><thead><tr><th>Comprobante</th><th>Fecha</th><th>Materia / sesión</th><th>Método</th><th>Monto</th><th></th></tr></thead><tbody>{pagos.map((item) => <tr key={item.idPago}><td>#{String(item.idPago).padStart(4, '0')}</td><td>{formatDate(item.fechaPago)}</td><td>{item.nombreMateria || item.concepto || 'Registro anterior'}{item.fechaSesion ? ` · ${formatDate(item.fechaSesion)}` : ''}</td><td>{item.metodoPago}</td><td>{money.format(Number(item.monto))}</td><td><button className="button button-small button-secondary" type="button" onClick={() => printReceipt(item)}>Comprobante</button></td></tr>)}</tbody></table></div></> : null}</div>
      <div className="panel note-panel"><strong>Alcance:</strong> el sistema registra pagos recibidos y genera comprobantes administrativos. El procesamiento bancario en línea y la facturación fiscal quedan fuera del alcance del proyecto.</div>
    </div>
  )
}
