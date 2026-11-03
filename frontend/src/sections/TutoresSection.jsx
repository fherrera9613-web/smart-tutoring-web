import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { matchesSearch } from '../utils/search.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = { nombre: '', apellido: '', correoElectronico: '', password: '', especialidad: '', experiencia: '' }
const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*"

export default function TutoresSection({ onUnauthorized }) {
  const [tutores, setTutores] = useState([])
  const [materias, setMaterias] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [assignmentTutorId, setAssignmentTutorId] = useState('')
  const [assignmentMateriaId, setAssignmentMateriaId] = useState('')
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
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="panel table-panel"><div className="catalog-filter"><input type="search" aria-label="Buscar tutores" placeholder="Buscar tutor, correo, especialidad o materia" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{loading ? <p>Cargando tutores…</p> : tutores.length === 0 ? <p className="muted">No hay tutores registrados.</p> : filteredTutores.length === 0 ? <p className="table-empty muted">No se encontraron tutores.</p> : <div className="table-wrap"><table><thead><tr><th>Tutor</th><th>Correo</th><th>Especialidad</th><th>Experiencia</th><th>Materias</th><th>Acción</th></tr></thead><tbody>{filteredTutores.map((item) => <tr key={item.idTutor}><td>{item.nombre} {item.apellido}</td><td>{item.correoElectronico}</td><td>{item.especialidad || '—'}</td><td>{item.experiencia ?? '—'}</td><td>{item.materias?.length ? item.materias.map((m) => m.nombreMateria).join(', ') : 'Sin asignar'}</td><td><button className="button button-small button-secondary" type="button" onClick={() => startEdit(item)}>Editar</button></td></tr>)}</tbody></table></div>}</div>
    </div>
  )
}
