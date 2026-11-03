import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { matchesSearch } from '../utils/search.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = { nombre: '', apellido: '', correoElectronico: '', password: '', especialidad: '', experiencia: '' }
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const NEW_BLOCK = { fecha: '', horaInicio: '', horaFin: '', motivo: '' }
const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*"

export default function TutoresSection({ onUnauthorized }) {
  const [tutores, setTutores] = useState([])
  const [materias, setMaterias] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [assignmentTutorId, setAssignmentTutorId] = useState('')
  const [assignmentMateriaId, setAssignmentMateriaId] = useState('')
  const [availabilityTutorId, setAvailabilityTutorId] = useState('')
  const [weeklyHours, setWeeklyHours] = useState([])
  const [blocks, setBlocks] = useState([])
  const [newBlock, setNewBlock] = useState(NEW_BLOCK)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { const [tutoresData, materiasData] = await Promise.all([api.tutores.listar(), api.materias.listar()]); setTutores(tutoresData); setMaterias(materiasData) }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filteredTutores = useMemo(() => tutores.filter((item) => matchesSearch(search, item.nombre, item.apellido, item.correoElectronico, item.especialidad, item.materias?.map((m) => m.nombreMateria).join(' '))), [tutores, search])

  async function loadAvailability(id) {
    if (!id) { setWeeklyHours([]); setBlocks([]); return }
    setScheduleLoading(true)
    try {
      const data = await api.tutores.disponibilidad(Number(id))
      setWeeklyHours(data.horarios.map(({ diaSemana, horaInicio, horaFin }) => ({
        diaSemana, horaInicio: horaInicio.slice(0, 5), horaFin: horaFin.slice(0, 5),
      })))
      setBlocks(data.bloqueos)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setScheduleLoading(false) }
  }

  function selectAvailabilityTutor(value) {
    setAvailabilityTutorId(value)
    setNewBlock(NEW_BLOCK)
    loadAvailability(value)
  }

  async function saveAvailability(event) {
    event.preventDefault()
    setError(''); setSuccess('')
    setScheduleSaving(true)
    try {
      await api.tutores.guardarHorarios(Number(availabilityTutorId), weeklyHours.map((item) => ({
        diaSemana: item.diaSemana, horaInicio: item.horaInicio, horaFin: item.horaFin,
      })))
      setSuccess('Jornada semanal actualizada correctamente.')
      await loadAvailability(availabilityTutorId)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setScheduleSaving(false) }
  }

  async function addBlock(event) {
    event.preventDefault()
    setError(''); setSuccess('')
    setScheduleSaving(true)
    try {
      await api.tutores.bloquearHorario(Number(availabilityTutorId), newBlock)
      setNewBlock(NEW_BLOCK)
      setSuccess('Bloqueo de disponibilidad registrado.')
      await loadAvailability(availabilityTutorId)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setScheduleSaving(false) }
  }

  async function deleteBlock(idBloqueo) {
    if (!window.confirm('¿Eliminar este bloqueo de disponibilidad?')) return
    setError(''); setSuccess('')
    try {
      await api.tutores.eliminarBloqueo(Number(availabilityTutorId), idBloqueo)
      setSuccess('Bloqueo eliminado.')
      await loadAvailability(availabilityTutorId)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
  }

  function updateField(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })) }
  function startEdit(item) { setEditingId(item.idTutor); setForm({ nombre: item.nombre || '', apellido: item.apellido || '', correoElectronico: item.correoElectronico || '', password: '', especialidad: item.especialidad || '', experiencia: item.experiencia ?? '' }); setError(''); setSuccess('') }
  function resetForm() { setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      if (editingId) {
        await api.tutores.actualizar(editingId, { nombre: form.nombre, apellido: form.apellido, especialidad: form.especialidad || null, experiencia: form.experiencia === '' ? null : Number(form.experiencia) })
        setSuccess('Tutor actualizado correctamente.')
      } else {
        await api.tutores.crear({ nombre: form.nombre, apellido: form.apellido, correoElectronico: form.correoElectronico, password: form.password, especialidad: form.especialidad || null, experiencia: form.experiencia === '' ? null : Number(form.experiencia) })
        setSuccess('Tutor registrado correctamente.')
      }
      resetForm(); await load()
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function assignSubject(event) {
    event.preventDefault()
    if (!assignmentTutorId || !assignmentMateriaId) { setError('Seleccione un tutor y una materia.'); return }
    setError(''); setSuccess('')
    try { await api.tutores.asignarMateria(Number(assignmentTutorId), Number(assignmentMateriaId)); setSuccess('Materia asignada al tutor correctamente.'); setAssignmentMateriaId(''); await load() }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Tutores</h2><p className="muted">Registro de tutores y asignación de materias.</p></div></div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Nombre<input name="nombre" value={form.nombre} onChange={updateField} required minLength="2" maxLength="100" pattern={NAME_PATTERN} title="Use únicamente letras, espacios, apóstrofes o guiones." /></label>
        <label>Apellido<input name="apellido" value={form.apellido} onChange={updateField} required minLength="2" maxLength="100" pattern={NAME_PATTERN} title="Use únicamente letras, espacios, apóstrofes o guiones." /></label>
        {!editingId && <label>Correo electrónico<input type="email" name="correoElectronico" value={form.correoElectronico} onChange={updateField} required maxLength="150" /></label>}
        {!editingId && <label>Contraseña<input type="password" name="password" value={form.password} onChange={updateField} required minLength="8" maxLength="100" /></label>}
        <label>Especialidad<input name="especialidad" value={form.especialidad} onChange={updateField} maxLength="150" /></label>
        <label>Años de experiencia<input type="number" min="0" max="80" name="experiencia" value={form.experiencia} onChange={updateField} /></label>
        <div className="form-actions span-2"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Registrar tutor'}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}</div>
      </form>
      <form className="panel inline-form" onSubmit={assignSubject}>
        <div><h3>Asignar materia</h3><p className="muted">Relaciona un tutor con una materia que puede impartir.</p></div>
        <SearchableSelect label="Tutor" value={assignmentTutorId} onChange={setAssignmentTutorId} options={tutores} getValue={(item) => item.idTutor} getLabel={(item) => `${item.nombre} ${item.apellido}`} required />
        <SearchableSelect label="Materia" value={assignmentMateriaId} onChange={setAssignmentMateriaId} options={materias} getValue={(item) => item.idMateria} getLabel={(item) => item.nombreMateria} required />
        <button className="button button-primary" type="submit">Asignar</button>
      </form>
      <div className="panel section-stack">
        <div><h3>Disponibilidad y jornada de tutores</h3>
          <p className="muted">Configure jornadas reales y excepciones. Si no existe jornada configurada, el sistema no puede garantizar disponibilidad fuera de las sesiones registradas.</p></div>
        <SearchableSelect label="Tutor" value={availabilityTutorId} onChange={selectAvailabilityTutor} options={tutores}
          getValue={(item) => item.idTutor} getLabel={(item) => `${item.nombre} ${item.apellido}`} placeholder="Buscar tutor para configurar su jornada" />
        {availabilityTutorId && (scheduleLoading ? <p className="muted">Cargando horarios…</p> : <>
          <form className="section-stack" onSubmit={saveAvailability}>
            <div className="section-heading"><h4>Jornada semanal</h4>
              <button type="button" className="button button-secondary" onClick={() => setWeeklyHours((current) => [...current, { diaSemana: 1, horaInicio: '08:00', horaFin: '09:00' }])}>Agregar intervalo</button>
            </div>
            {weeklyHours.length === 0 && <p className="muted">Sin jornada configurada. Agregue los intervalos que el tutor confirmó.</p>}
            {weeklyHours.map((entry, index) => <div key={index} className="form-grid">
              <label>Día<select value={entry.diaSemana} onChange={(event) => setWeeklyHours((current) => current.map((item, i) => i === index ? { ...item, diaSemana: Number(event.target.value) } : item))}>
                {DAYS.map((day, dayIndex) => <option key={dayIndex} value={dayIndex}>{day}</option>)}
              </select></label>
              <div className="form-actions">
                <label>Desde<input type="time" step="900" required value={entry.horaInicio} onChange={(event) => setWeeklyHours((current) => current.map((item, i) => i === index ? { ...item, horaInicio: event.target.value } : item))} /></label>
                <label>Hasta<input type="time" step="900" required value={entry.horaFin} onChange={(event) => setWeeklyHours((current) => current.map((item, i) => i === index ? { ...item, horaFin: event.target.value } : item))} /></label>
                <button className="button button-danger" type="button" onClick={() => setWeeklyHours((current) => current.filter((_, i) => i !== index))}>Quitar</button>
              </div>
            </div>)}
            <div className="form-actions"><button type="submit" className="button button-primary" disabled={scheduleSaving}>{scheduleSaving ? 'Guardando…' : 'Guardar jornada'}</button></div>
          </form>
          <form className="section-stack" onSubmit={addBlock}>
            <h4>Bloquear un horario (ausencia o excepción)</h4>
            <div className="form-grid">
              <label>Fecha<input type="date" min={getLocalIsoDate()} value={newBlock.fecha} required onChange={(event) => setNewBlock((current) => ({ ...current, fecha: event.target.value }))} /></label>
              <label>Motivo (opcional)<input maxLength="150" value={newBlock.motivo} onChange={(event) => setNewBlock((current) => ({ ...current, motivo: event.target.value }))} placeholder="Permiso, vacaciones…" /></label>
              <label>Desde<input type="time" step="900" required value={newBlock.horaInicio} onChange={(event) => setNewBlock((current) => ({ ...current, horaInicio: event.target.value }))} /></label>
              <label>Hasta<input type="time" step="900" required value={newBlock.horaFin} onChange={(event) => setNewBlock((current) => ({ ...current, horaFin: event.target.value }))} /></label>
            </div>
            <button type="submit" className="button button-secondary" disabled={scheduleSaving}>Agregar bloqueo</button>
          </form>
          {blocks.length > 0 && <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario bloqueado</th><th>Motivo</th><th>Acción</th></tr></thead><tbody>
            {blocks.map((item) => <tr key={item.idBloqueo}><td>{item.fecha}</td><td>{item.horaInicio?.slice(0,5)}–{item.horaFin?.slice(0,5)}</td><td>{item.motivo || '—'}</td>
              <td><button type="button" className="button button-small button-danger" onClick={() => deleteBlock(item.idBloqueo)}>Eliminar</button></td></tr>)}
          </tbody></table></div>}
        </>)}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="panel table-panel"><div className="catalog-filter"><input type="search" aria-label="Buscar tutores" placeholder="Buscar tutor, correo, especialidad o materia" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{loading ? <p>Cargando tutores…</p> : tutores.length === 0 ? <p className="muted">No hay tutores registrados.</p> : filteredTutores.length === 0 ? <p className="table-empty muted">No se encontraron tutores.</p> : <div className="table-wrap"><table><thead><tr><th>Tutor</th><th>Correo</th><th>Especialidad</th><th>Experiencia</th><th>Materias</th><th>Acción</th></tr></thead><tbody>{filteredTutores.map((item) => <tr key={item.idTutor}><td>{item.nombre} {item.apellido}</td><td>{item.correoElectronico}</td><td>{item.especialidad || '—'}</td><td>{item.experiencia ?? '—'}</td><td>{item.materias?.length ? item.materias.map((m) => m.nombreMateria).join(', ') : 'Sin asignar'}</td><td><button className="button button-small button-secondary" type="button" onClick={() => startEdit(item)}>Editar</button></td></tr>)}</tbody></table></div>}</div>
    </div>
  )
}
