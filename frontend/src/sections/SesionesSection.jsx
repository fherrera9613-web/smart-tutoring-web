import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = { idEstudiante: '', idTutor: '', idMateria: '', fecha: '', horaInicio: '', horaFin: '' }

export default function SesionesSection({ onUnauthorized }) {
  const [sesiones, setSesiones] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [tutores, setTutores] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterTutor, setFilterTutor] = useState('')
  const [filterDate, setFilterDate] = useState(() => getLocalIsoDate())
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [sesionesData, estudiantesData, tutoresData] = await Promise.all([api.sesiones.listar(), api.estudiantes.listar(), api.tutores.listar()])
      setSesiones(sesionesData); setEstudiantes(estudiantesData); setTutores(tutoresData)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const materiasDisponibles = useMemo(() => {
    const tutor = tutores.find((item) => String(item.idTutor) === form.idTutor)
    return tutor?.materias || []
  }, [tutores, form.idTutor])

  const filteredSessions = useMemo(() => {
    if (!filterTutor) return []
    return sesiones.filter((item) =>
      String(item.idTutor) === filterTutor &&
      (!filterDate || item.fecha === filterDate)
    )
  }, [sesiones, filterTutor, filterDate])

  const bookedSessions = useMemo(
    () => filteredSessions.filter((item) => item.estado !== 'Cancelada'),
    [filteredSessions]
  )

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value, ...(name === 'idTutor' ? { idMateria: '' } : {}) }))
  }
  function startReprogram(item) {
    setEditingId(item.idSesion)
    setForm({ idEstudiante: String(item.idEstudiante), idTutor: String(item.idTutor), idMateria: String(item.idMateria), fecha: item.fecha || '', horaInicio: (item.horaInicio || '').slice(0, 5), horaFin: (item.horaFin || '').slice(0, 5) })
    setError(''); setSuccess('')
  }
  function resetForm() { setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setSuccess('')
    const inicio = new Date(`${form.fecha}T${form.horaInicio}:00`)
    if (Number.isNaN(inicio.getTime()) || inicio <= new Date()) { setError('Seleccione una fecha y hora de inicio futuras.'); return }

    setSaving(true)
    const schedule = { fecha: form.fecha, horaInicio: form.horaInicio.length === 5 ? `${form.horaInicio}:00` : form.horaInicio, horaFin: form.horaFin.length === 5 ? `${form.horaFin}:00` : form.horaFin }
    try {
      if (editingId) { await api.sesiones.reprogramar(editingId, schedule); setSuccess('Sesión reprogramada correctamente.') }
      else { await api.sesiones.crear({ idEstudiante: Number(form.idEstudiante), idTutor: Number(form.idTutor), idMateria: Number(form.idMateria), ...schedule }); setSuccess('Sesión programada correctamente.') }
      resetForm(); await load()
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function cancelSession(id) {
    if (!window.confirm('¿Desea cancelar esta sesión?')) return
    setError(''); setSuccess('')
    try { await api.sesiones.cancelar(id); setSuccess('Sesión cancelada correctamente.'); await load() }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Sesiones de tutoría</h2><p className="muted">Agenda de tutorías futuras y control de horarios.</p></div></div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        {!editingId && <SearchableSelect label="Estudiante" value={form.idEstudiante} onChange={(value) => setForm((current) => ({ ...current, idEstudiante: value }))} options={estudiantes} getValue={(item) => item.idEstudiante} getLabel={(item) => `${item.nombre} ${item.apellido} — ${item.carnet}`} required />}
        {!editingId && <SearchableSelect label="Tutor" value={form.idTutor} onChange={(value) => setForm((current) => ({ ...current, idTutor: value, idMateria: '' }))} options={tutores} getValue={(item) => item.idTutor} getLabel={(item) => `${item.nombre} ${item.apellido}`} required />}
        {!editingId && <SearchableSelect label="Materia" value={form.idMateria} onChange={(value) => setForm((current) => ({ ...current, idMateria: value }))} options={materiasDisponibles} getValue={(item) => item.idMateria} getLabel={(item) => item.nombreMateria} disabled={!form.idTutor} placeholder={form.idTutor ? 'Buscar materia' : 'Seleccione primero un tutor'} required />}
        <label>Fecha<input type="date" name="fecha" value={form.fecha} onChange={updateField} required min={getLocalIsoDate()} /></label>
        <label>Hora de inicio<input type="time" name="horaInicio" value={form.horaInicio} onChange={updateField} required step="900" /></label>
        <label>Hora de finalización<input type="time" name="horaFin" value={form.horaFin} onChange={updateField} required step="900" /></label>
        <div className="form-actions span-2"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Reprogramar sesión' : 'Agendar sesión'}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}</div>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="panel">
        <div className="section-heading"><div><h3>Consultar horario por tutor</h3><p className="muted">Seleccione un tutor y una fecha para consultar las sesiones registradas. Los intervalos que no aparecen no garantizan disponibilidad fuera de su jornada laboral.</p></div></div>
        <div className="form-grid payment-filters">
          <SearchableSelect label="Tutor" value={filterTutor} onChange={setFilterTutor} options={tutores} getValue={(item) => item.idTutor} getLabel={(item) => `${item.nombre} ${item.apellido}`} placeholder="Buscar tutor por nombre" />
          <label>Fecha<input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} /></label>
        </div>
        {filterTutor && !loading && <p className="muted" style={{ margin: '12px 0 0' }}>Sesiones que ocupan horario: <strong>{bookedSessions.length}</strong>{filterDate ? ' en la fecha seleccionada' : ' en todas las fechas'}.</p>}
      </div>
      <div className="panel table-panel">{loading ? <p>Cargando sesiones…</p> : sesiones.length === 0 ? <p className="table-empty muted">No hay sesiones registradas.</p> : !filterTutor ? <p className="table-empty muted">Seleccione un tutor para visualizar su agenda.</p> : filteredSessions.length === 0 ? <p className="table-empty muted">No hay sesiones registradas para este tutor en la fecha indicada.</p> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filteredSessions.map((item) => <tr key={item.idSesion}><td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.nombreEstudiante}</td><td>{item.nombreTutor}</td><td>{item.nombreMateria}</td><td><span className={`status status-${String(item.estado).toLowerCase()}`}>{item.estado}</span></td><td className="actions-cell">{item.estado === 'Programada' ? <><button className="button button-small button-secondary" type="button" onClick={() => startReprogram(item)}>Reprogramar</button><button className="button button-small button-danger" type="button" onClick={() => cancelSession(item.idSesion)}>Cancelar</button></> : <span className="muted">Sin acciones</span>}</td></tr>)}</tbody></table></div>}</div>
    </div>
  )
}
