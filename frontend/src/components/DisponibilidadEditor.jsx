import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const EMPTY_BLOCK = { fecha: '', horaInicio: '', horaFin: '', motivo: '' }

export default function DisponibilidadEditor({ idTutor, onUnauthorized, title = 'Jornada semanal y ausencias' }) {
  const [weeklyHours, setWeeklyHours] = useState([])
  const [blocks, setBlocks] = useState([])
  const [newBlock, setNewBlock] = useState(EMPTY_BLOCK)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!idTutor) { setWeeklyHours([]); setBlocks([]); return }
    let active = true
    setLoading(true)
    setError('')
    api.tutores.disponibilidad(idTutor)
      .then((data) => {
        if (!active) return
        setWeeklyHours(data.horarios.map((entry) => ({
          diaSemana: entry.diaSemana,
          horaInicio: entry.horaInicio.slice(0, 5),
          horaFin: entry.horaFin.slice(0, 5),
        })))
        setBlocks(data.bloqueos)
      })
      .catch((err) => { if (active) setError(resolveErrorMessage(err, onUnauthorized)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [idTutor, revision])

  function changeHour(index, property, value) {
    setWeeklyHours((current) => current.map((item, i) =>
      i === index ? { ...item, [property]: value } : item))
  }

  async function saveHours(event) {
    event.preventDefault()
    setError(''); setSuccess('')
    if (!idTutor) return
    const valid = weeklyHours.every((item) => {
      const [sh, sm] = item.horaInicio.split(':').map(Number)
      const [eh, em] = item.horaFin.split(':').map(Number)
      return Number.isInteger(sh) && Number.isInteger(sm) && Number.isInteger(eh) && Number.isInteger(em) &&
        sm % 15 === 0 && em % 15 === 0 && (eh * 60 + em) > (sh * 60 + sm)
    })
    if (!valid) { setError('Revise los intervalos: deben estar ordenados y usar cuartos de hora.'); return }
    setSaving(true)
    try {
      await api.tutores.guardarHorarios(idTutor, weeklyHours)
      setSuccess('Tu disponibilidad semanal se guardó correctamente.')
      setRevision((v) => v + 1)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function addBlock(event) {
    event.preventDefault()
    setError(''); setSuccess('')
    if (!idTutor) return
    setSaving(true)
    try {
      await api.tutores.bloquearHorario(idTutor, newBlock)
      setNewBlock(EMPTY_BLOCK)
      setSuccess('La ausencia o excepción se registró correctamente.')
      setRevision((v) => v + 1)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function removeBlock(idBloqueo) {
    if (!window.confirm('¿Eliminar este bloqueo de disponibilidad?')) return
    setError(''); setSuccess('')
    setSaving(true)
    try {
      await api.tutores.eliminarBloqueo(idTutor, idBloqueo)
      setSuccess('Se eliminó el bloqueo.')
      setRevision((v) => v + 1)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  return (
    <div className="panel section-stack">
      <div>
        <h3>{title}</h3>
        <p className="muted">Indica los días y horas en que puedes impartir tutorías. Puedes agregar varios intervalos por día para incluir descansos. Las sesiones ya reservadas deben conservarse dentro de tu jornada.</p>
      </div>
      {!idTutor ? <p className="muted">Selecciona un tutor para editar su disponibilidad.</p> : loading ? <p className="muted">Cargando disponibilidad…</p> : <>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}
        <form className="section-stack" onSubmit={saveHours}>
          <div className="section-heading">
            <div><h4>Disponibilidad semanal</h4><p className="muted">Los horarios se repiten cada semana hasta que los actualices.</p></div>
            <button type="button" className="button button-secondary" disabled={saving || weeklyHours.length >= 28}
              onClick={() => setWeeklyHours((list) => [...list, { diaSemana: 1, horaInicio: '08:00', horaFin: '09:00' }])}>Agregar intervalo</button>
          </div>
          {weeklyHours.length === 0 && <p className="muted">Todavía no has definido tu jornada. Agrega tus días y horarios disponibles.</p>}
          {weeklyHours.map((item, index) => <div key={index} className="form-grid">
            <label>Día de la semana
              <select value={item.diaSemana} disabled={saving} onChange={(e) => changeHour(index, 'diaSemana', Number(e.target.value))}>
                {DAYS.map((day, i) => <option value={i} key={day}>{day}</option>)}
              </select>
            </label>
            <div className="form-actions">
              <label>Desde<input type="time" required step="900" disabled={saving} value={item.horaInicio} onChange={(e) => changeHour(index, 'horaInicio', e.target.value)} /></label>
              <label>Hasta<input type="time" required step="900" disabled={saving} value={item.horaFin} onChange={(e) => changeHour(index, 'horaFin', e.target.value)} /></label>
              <button type="button" className="button button-danger" disabled={saving} onClick={() => setWeeklyHours((list) => list.filter((_, i) => i !== index))}>Quitar</button>
            </div>
          </div>)}
          <div className="form-actions"><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar disponibilidad'}</button></div>
        </form>
        <form className="section-stack" onSubmit={addBlock}>
          <div><h4>Ausencias y excepciones</h4><p className="muted">Para vacaciones, permisos o compromisos puntuales, bloquea un horario sin cambiar toda tu semana.</p></div>
          <div className="form-grid">
            <label>Fecha<input type="date" required min={getLocalIsoDate()} disabled={saving} value={newBlock.fecha} onChange={(e) => setNewBlock((v) => ({ ...v, fecha: e.target.value }))} /></label>
            <label>Motivo (opcional)<input maxLength="150" disabled={saving} value={newBlock.motivo} onChange={(e) => setNewBlock((v) => ({ ...v, motivo: e.target.value }))} /></label>
            <label>Desde<input type="time" required step="900" disabled={saving} value={newBlock.horaInicio} onChange={(e) => setNewBlock((v) => ({ ...v, horaInicio: e.target.value }))} /></label>
            <label>Hasta<input type="time" required step="900" disabled={saving} value={newBlock.horaFin} onChange={(e) => setNewBlock((v) => ({ ...v, horaFin: e.target.value }))} /></label>
          </div>
          <button type="submit" className="button button-secondary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar ausencia'}</button>
        </form>
        {blocks.length > 0 && <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Motivo</th><th>Acción</th></tr></thead><tbody>
          {blocks.map((item) => <tr key={item.idBloqueo}>
            <td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.motivo || '—'}</td>
            <td><button type="button" className="button button-small button-danger" disabled={saving} onClick={() => removeBlock(item.idBloqueo)}>Eliminar</button></td>
          </tr>)}
        </tbody></table></div>}
      </>}
    </div>
  )
}
