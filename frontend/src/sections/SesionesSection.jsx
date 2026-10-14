import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = {
  idEstudiante: '',
  idTutor: '',
  idMateria: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
}

export default function SesionesSection({ onUnauthorized }) {
  const [sesiones, setSesiones] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [tutores, setTutores] = useState([])
  const [materias, setMaterias] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [sesionesData, estudiantesData, tutoresData, materiasData] = await Promise.all([
        api.sesiones.listar(),
        api.estudiantes.listar(),
        api.tutores.listar(),
        api.materias.listar(),
      ])
      setSesiones(sesionesData)
      setEstudiantes(estudiantesData)
      setTutores(tutoresData)
      setMaterias(materiasData)
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function startReprogram(item) {
    setEditingId(item.idSesion)
    setForm({
      idEstudiante: String(item.idEstudiante),
      idTutor: String(item.idTutor),
      idMateria: String(item.idMateria),
      fecha: item.fecha || '',
      horaInicio: (item.horaInicio || '').slice(0, 5),
      horaFin: (item.horaFin || '').slice(0, 5),
    })
    setError('')
    setSuccess('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const schedule = {
      fecha: form.fecha,
      horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio,
      horaFin: form.horaFin.length === 5 ? `${form.horaFin}:00` : form.horaFin,
    }

    try {
      if (editingId) {
        await api.sesiones.reprogramar(editingId, schedule)
        setSuccess('Sesión reprogramada correctamente.')
      } else {
        await api.sesiones.crear({
          idEstudiante: Number(form.idEstudiante),
          idTutor: Number(form.idTutor),
          idMateria: Number(form.idMateria),
          ...schedule,
        })
        setSuccess('Sesión programada correctamente.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setSaving(false)
    }
  }

  async function cancelSession(id) {
    if (!window.confirm('¿Desea cancelar esta sesión?')) return
    setError('')
    setSuccess('')
    try {
      await api.sesiones.cancelar(id)
      setSuccess('Sesión cancelada correctamente.')
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Sesiones de tutoría</h2><p className="muted">Programación y control de horarios.</p></div></div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        {!editingId && <label>Estudiante<select name="idEstudiante" value={form.idEstudiante} onChange={updateField} required><option value="">Seleccione</option>{estudiantes.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{item.nombre} {item.apellido} — {item.carnet}</option>)}</select></label>}
        {!editingId && <label>Tutor<select name="idTutor" value={form.idTutor} onChange={updateField} required><option value="">Seleccione</option>{tutores.map((item) => <option key={item.idTutor} value={item.idTutor}>{item.nombre} {item.apellido}</option>)}</select></label>}
        {!editingId && <label>Materia<select name="idMateria" value={form.idMateria} onChange={updateField} required><option value="">Seleccione</option>{materias.map((item) => <option key={item.idMateria} value={item.idMateria}>{item.nombreMateria}</option>)}</select></label>}
        <label>Fecha<input type="date" name="fecha" value={form.fecha} onChange={updateField} required /></label>
        <label>Hora de inicio<input type="time" name="horaInicio" value={form.horaInicio} onChange={updateField} required /></label>
        <label>Hora de finalización<input type="time" name="horaFin" value={form.horaFin} onChange={updateField} required /></label>
        <div className="form-actions span-2">
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Reprogramar sesión' : 'Programar sesión'}</button>
          {editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel table-panel">
        {loading ? <p>Cargando sesiones…</p> : sesiones.length === 0 ? <p className="muted">No hay sesiones registradas.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
            {sesiones.map((item) => (
              <tr key={item.idSesion}>
                <td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.nombreEstudiante}</td><td>{item.nombreTutor}</td><td>{item.nombreMateria}</td><td><span className={`status status-${String(item.estado).toLowerCase()}`}>{item.estado}</span></td>
                <td className="actions-cell">
                  {item.estado === 'Programada' ? <><button className="button button-small button-secondary" type="button" onClick={() => startReprogram(item)}>Reprogramar</button><button className="button button-small button-danger" type="button" onClick={() => cancelSession(item.idSesion)}>Cancelar</button></> : <span className="muted">Sin acciones</span>}
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  )
}
