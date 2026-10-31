import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'
import { getLocalIsoDate } from '../utils/date.js'

const EMPTY_FORM = { nombre: '', apellido: '', fechaNacimiento: '', carnet: '', telefono: '' }
const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*"
const CARNET_PATTERN = 'ST-[0-9]{4}'
const PHONE_PATTERN = '[0-9]{4}-?[0-9]{4}'

export default function EstudiantesSection({ onUnauthorized }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setItems(await api.estudiantes.listar()) }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function updateField(event) {
    const { name } = event.target
    const value = name === 'carnet' ? event.target.value.toUpperCase() : event.target.value
    setForm((current) => ({ ...current, [name]: value }))
  }

  function startEdit(item) {
    setEditingId(item.idEstudiante)
    setForm({ nombre: item.nombre || '', apellido: item.apellido || '', fechaNacimiento: item.fechaNacimiento || '', carnet: item.carnet || '', telefono: item.telefono || '' })
    setSuccess(''); setError('')
  }
  function resetForm() { setEditingId(null); setForm(EMPTY_FORM) }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      if (editingId) {
        await api.estudiantes.actualizar(editingId, form)
        setSuccess('Estudiante actualizado correctamente.')
      } else {
        await api.estudiantes.crear(form)
        setSuccess('Estudiante registrado correctamente.')
      }
      resetForm(); await load()
    } catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function showHistory(id) {
    setError(''); setHistory(null)
    try { setHistory(await api.estudiantes.historialAcademico(id)) }
    catch (err) { setError(resolveErrorMessage(err, onUnauthorized)) }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Estudiantes</h2><p className="muted">Registro, actualización e historial académico.</p></div></div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Nombre<input name="nombre" value={form.nombre} onChange={updateField} required minLength="2" maxLength="100" pattern={NAME_PATTERN} title="Use únicamente letras, espacios, apóstrofes o guiones." /></label>
        <label>Apellido<input name="apellido" value={form.apellido} onChange={updateField} required minLength="2" maxLength="100" pattern={NAME_PATTERN} title="Use únicamente letras, espacios, apóstrofes o guiones." /></label>
        <label>Fecha de nacimiento<input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={updateField} required max={getLocalIsoDate()} /></label>
        <label>Carnet<input name="carnet" value={form.carnet} onChange={updateField} required minLength="7" maxLength="7" pattern={CARNET_PATTERN} placeholder="Ej. ST-0001" title="Use el formato ST-0001: prefijo ST, guion y cuatro dígitos." /><small className="muted">Formato institucional: ST-0001.</small></label>
        <label>Teléfono<input type="tel" name="telefono" value={form.telefono} onChange={updateField} maxLength="9" pattern={PHONE_PATTERN} placeholder="Ej. 8888-1111" title="Ingrese exactamente 8 dígitos, con o sin guion." /><small className="muted">Opcional. Debe contener 8 dígitos.</small></label>
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Registrar'}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}</div>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="panel table-panel">
        {loading ? <p>Cargando estudiantes…</p> : items.length === 0 ? <p className="muted">No hay estudiantes registrados.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Carnet</th><th>Nombre</th><th>Nacimiento</th><th>Teléfono</th><th>Acciones</th></tr></thead><tbody>
            {items.map((item) => <tr key={item.idEstudiante}><td>{item.carnet}</td><td>{item.nombre} {item.apellido}</td><td>{item.fechaNacimiento}</td><td>{item.telefono || '—'}</td><td className="actions-cell"><button className="button button-small button-secondary" type="button" onClick={() => startEdit(item)}>Editar</button><button className="button button-small button-ghost" type="button" onClick={() => showHistory(item.idEstudiante)}>Historial</button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      {history && <div className="panel"><div className="section-heading compact"><div><h3>Historial académico — {history.nombreEstudiante}</h3><p className="muted">Carnet: {history.carnet}</p></div><button className="button button-secondary" type="button" onClick={() => setHistory(null)}>Cerrar</button></div>{history.sesiones?.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Materia</th><th>Tutor</th><th>Sesión</th><th>Asistencia</th><th>Tema</th></tr></thead><tbody>{history.sesiones.map((row) => <tr key={row.idSesion}><td>{row.fecha}</td><td>{row.nombreMateria}</td><td>{row.nombreTutor}</td><td><span className={`status status-${row.estadoSesion.toLowerCase()}`}>{row.estadoSesion}</span></td><td>{row.estadoAsistencia ? <span className={`status ${row.estadoAsistencia === 'Presente' ? 'status-completada' : 'status-cancelada'}`}>{row.estadoAsistencia}</span> : '—'}</td><td>{row.temaTrabajado || '—'}</td></tr>)}</tbody></table></div> : <p className="muted">El estudiante todavía no tiene sesiones en su historial.</p>}</div>}
    </div>
  )
}
