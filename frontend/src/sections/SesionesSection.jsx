import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = { idEstudiante: '', idTutor: '', idMateria: '', fecha: '', horaInicio: '', horaFin: '', tarifaUsdPorSesion: '' }

export default function SesionesSection({ onUnauthorized }) {
  const [sesiones, setSesiones] = useState([])
  const [agendaTotal, setAgendaTotal] = useState(0)
  const [agendaPage, setAgendaPage] = useState(1)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaRevision, setAgendaRevision] = useState(0)
  const [freeSlots, setFreeSlots] = useState([])
  const [availabilityConfigured, setAvailabilityConfigured] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
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
      const [estudiantesData, tutoresData] = await Promise.all([api.estudiantes.listar(), api.tutores.listar()])
      setEstudiantes(estudiantesData); setTutores(tutoresData)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const materiasDisponibles = useMemo(() => {
    const tutor = tutores.find((item) => String(item.idTutor) === form.idTutor)
    return tutor?.materias || []
  }, [tutores, form.idTutor])

  const bookedSessions = useMemo(
    () => sesiones.filter((item) => item.estado !== 'Cancelada'),
    [sesiones]
  )

  useEffect(() => { setAgendaPage(1) }, [filterTutor, filterDate])

  useEffect(() => {
    if (!filterTutor) { setSesiones([]); setAgendaTotal(0); return }
    let active = true
    setAgendaLoading(true)
    api.sesiones.agenda(Number(filterTutor), filterDate, agendaPage)
      .then((data) => {
        if (!active) return
        setSesiones(data.items)
        setAgendaTotal(data.total)
      })
      .catch((err) => { if (active) setError(resolveErrorMessage(err, onUnauthorized)) })
      .finally(() => { if (active) setAgendaLoading(false) })
    return () => { active = false }
  }, [filterTutor, filterDate, agendaPage, agendaRevision])

  useEffect(() => {
    if (!filterTutor || !filterDate) {
      setFreeSlots([])
      setAvailabilityConfigured(false)
      return
    }
    let active = true
    setAvailabilityLoading(true)
    api.tutores.espaciosLibres(Number(filterTutor), filterDate)
      .then((result) => {
        if (!active) return
        setFreeSlots(result.intervalos)
        setAvailabilityConfigured(result.configurado)
      })
      .catch((err) => { if (active) setError(resolveErrorMessage(err, onUnauthorized)) })
      .finally(() => { if (active) setAvailabilityLoading(false) })
    return () => { active = false }
  }, [filterTutor, filterDate, agendaRevision])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value, ...(name === 'idTutor' ? { idMateria: '' } : {}) }))
  }
  function startReprogram(item) {
    setEditingId(item.idSesion)
    setForm({ idEstudiante: String(item.idEstudiante), idTutor: String(item.idTutor), idMateria: String(item.idMateria), fecha: item.fecha || '', horaInicio: (item.horaInicio || '').slice(0, 5), horaFin: (item.horaFin || '').slice(0, 5), tarifaUsdPorSesion: item.tarifaUsdPorSesion ?? '' })
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
      else { await api.sesiones.crear({ idEstudiante: Number(form.idEstudiante), idTutor: Number(form.idTutor), idMateria: Number(form.idMateria), tarifaUsdPorSesion: form.tarifaUsdPorSesion === '' ? null : Number(form.tarifaUsdPorSesion), ...schedule }); setSuccess('Sesión programada correctamente.') }
      resetForm(); await load(); setAgendaRevision((value) => value + 1)
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function cancelSession(id) {
    if (!window.confirm('¿Desea cancelar esta sesión?')) return
    setError(''); setSuccess('')
    try { await api.sesiones.cancelar(id); setSuccess('Sesión cancelada correctamente.'); await load(); setAgendaRevision((value) => value + 1) }
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
        {!editingId && <label>Tarifa acordada por sesión (USD, opcional)<input type="number" name="tarifaUsdPorSesion" min="0.01" max="10000" step="0.01" value={form.tarifaUsdPorSesion} onChange={updateField} placeholder="Sin definir: tarifa académica por hora" /><small className="muted">La tarifa se fija al programar. Si queda vacía, se conserva el cálculo horario vigente.</small></label>}
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
        {filterTutor && filterDate && <div className="subpanel" style={{ marginTop: 14 }}>
          <h4>Espacios disponibles</h4>
          {availabilityLoading ? <p className="muted">Consultando disponibilidad…</p> : !availabilityConfigured
            ? <p className="muted">Este tutor aún no tiene una jornada configurada. Configure sus horarios en Tutores para consultar disponibilidad real.</p>
            : freeSlots.length === 0
              ? <p className="muted">No hay espacios disponibles en la fecha seleccionada.</p>
              : <div className="form-actions">{freeSlots.map((slot, index) => <button type="button" className="button button-secondary" key={index}
                onClick={() => {
                  const start = slot.horaInicio.slice(0, 5)
                  const [hh, mm] = start.split(':').map(Number)
                  const [endHour, endMinute] = slot.horaFin.slice(0, 5).split(':').map(Number)
                  const end = Math.min(hh * 60 + mm + 60, endHour * 60 + endMinute)
                  setEditingId(null)
                  setForm((current) => ({ ...current, idTutor: filterTutor, idMateria: '', fecha: filterDate,
                    horaInicio: start, horaFin: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}` }))
                }} title="Preparar una sesión en este intervalo">{slot.horaInicio.slice(0, 5)}–{slot.horaFin.slice(0, 5)} · Usar</button>)}</div>}
        </div>}
        {filterTutor && !loading && <p className="muted" style={{ margin: '12px 0 0' }}>Sesiones que ocupan horario en esta página: <strong>{bookedSessions.length}</strong>{filterDate ? ' en la fecha seleccionada' : ' en todas las fechas'}.</p>}
      </div>
      <div className="panel table-panel">{loading || agendaLoading ? <p className="table-empty">Cargando sesiones…</p> : !filterTutor ? <p className="table-empty muted">Seleccione un tutor para visualizar su agenda.</p> : sesiones.length === 0 ? <p className="table-empty muted">No hay sesiones registradas para este tutor en la fecha indicada.</p> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Tutor</th><th>Materia</th><th>Tarifa USD</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{sesiones.map((item) => <tr key={item.idSesion}><td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.nombreEstudiante}</td><td>{item.nombreTutor}</td><td>{item.nombreMateria}</td><td>{item.tarifaUsdPorSesion == null ? 'Por hora' : `${Number(item.tarifaUsdPorSesion).toFixed(2)} por sesión`}</td><td><span className={`status status-${String(item.estado).toLowerCase()}`}>{item.estado}</span></td><td className="actions-cell">{item.estado === 'Programada' ? <><button className="button button-small button-secondary" type="button" onClick={() => startReprogram(item)}>Reprogramar</button><button className="button button-small button-danger" type="button" onClick={() => cancelSession(item.idSesion)}>Cancelar</button></> : <span className="muted">Sin acciones</span>}</td></tr>)}</tbody></table></div>}
        {filterTutor && agendaTotal > 50 && <div className="form-actions catalog-filter">
          <span className="muted">Página {agendaPage} de {Math.ceil(agendaTotal / 50)} · {agendaTotal} sesiones</span>
          <button type="button" className="button button-secondary" disabled={agendaPage === 1 || agendaLoading} onClick={() => setAgendaPage((p) => p - 1)}>Anterior</button>
          <button type="button" className="button button-secondary" disabled={agendaPage * 50 >= agendaTotal || agendaLoading} onClick={() => setAgendaPage((p) => p + 1)}>Siguiente</button>
        </div>}
      </div>
    </div>
  )
}
