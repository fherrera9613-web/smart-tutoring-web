import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = { nombreMateria: '', descripcion: '', nivel: '' }

export default function MateriasSection({ onUnauthorized }) {
  const [items, setItems] = useState([])
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
      setItems(await api.materias.listar())
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

  function startEdit(item) {
    setEditingId(item.idMateria)
    setForm({
      nombreMateria: item.nombreMateria || '',
      descripcion: item.descripcion || '',
      nivel: item.nivel || '',
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

    try {
      if (editingId) {
        await api.materias.actualizar(editingId, form)
        setSuccess('Materia actualizada correctamente.')
      } else {
        await api.materias.crear(form)
        setSuccess('Materia registrada correctamente.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Materias</h2><p className="muted">Catálogo de materias disponibles para tutoría.</p></div></div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Nombre de la materia<input name="nombreMateria" value={form.nombreMateria} onChange={updateField} required maxLength="120" /></label>
        <label>Nivel<input name="nivel" value={form.nivel} onChange={updateField} maxLength="100" placeholder="Ej. Secundaria" /></label>
        <label className="span-2">Descripción<textarea name="descripcion" value={form.descripcion} onChange={updateField} rows="3" maxLength="500" /></label>
        <div className="form-actions span-2">
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Registrar'}</button>
          {editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel table-panel">
        {loading ? <p>Cargando materias…</p> : items.length === 0 ? <p className="muted">No hay materias registradas.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Materia</th><th>Nivel</th><th>Descripción</th><th>Acción</th></tr></thead><tbody>
            {items.map((item) => <tr key={item.idMateria}><td>{item.nombreMateria}</td><td>{item.nivel || '—'}</td><td>{item.descripcion || '—'}</td><td><button className="button button-small button-secondary" type="button" onClick={() => startEdit(item)}>Editar</button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  )
}
