import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'

const EMPTY_FORM = {
  correoElectronico: '',
  password: '',
  rol: 'PersonalAdministrativo',
}

export default function UsuariosSection({ onUnauthorized }) {
  const [usuarios, setUsuarios] = useState([])
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
      setUsuarios(await api.usuarios.listar())
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
    setEditingId(item.idUsuario)
    setForm({
      correoElectronico: item.correoElectronico,
      password: '',
      rol: item.rol,
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
        await api.usuarios.actualizar(editingId, {
          correoElectronico: form.correoElectronico,
          rol: form.rol,
        })
        setSuccess('Usuario actualizado correctamente.')
      } else {
        await api.usuarios.crear(form)
        setSuccess('Usuario registrado correctamente.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id) {
    if (!window.confirm('¿Desea desactivar este usuario?')) return
    setError('')
    setSuccess('')
    try {
      await api.usuarios.desactivar(id)
      setSuccess('Usuario desactivado correctamente.')
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Usuarios</h2><p className="muted">Administración de cuentas y roles del sistema.</p></div></div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>Correo electrónico<input type="email" name="correoElectronico" value={form.correoElectronico} onChange={updateField} required /></label>
        {!editingId && <label>Contraseña<input type="password" name="password" value={form.password} onChange={updateField} minLength="8" required /></label>}
        <label>Rol<select name="rol" value={form.rol} onChange={updateField} required><option value="PersonalAdministrativo">Personal administrativo</option><option value="Administrador">Administrador</option>{editingId && form.rol === 'Tutor' && <option value="Tutor">Tutor</option>}</select></label>
        <div className="form-actions span-2"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Actualizar usuario' : 'Registrar usuario'}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancelar edición</button>}</div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel table-panel">
        {loading ? <p>Cargando usuarios…</p> : (
          <div className="table-wrap"><table><thead><tr><th>Correo</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>
            {usuarios.map((item) => (
              <tr key={item.idUsuario}>
                <td>{item.correoElectronico}</td><td>{item.rol}</td><td><span className={item.activo ? 'status status-activo' : 'status status-inactivo'}>{item.activo ? 'Activo' : 'Inactivo'}</span></td><td>{item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleString('es-NI') : '—'}</td>
                <td className="actions-cell"><button className="button button-small button-secondary" type="button" onClick={() => startEdit(item)}>Editar</button>{item.activo && <button className="button button-small button-danger" type="button" onClick={() => deactivate(item.idUsuario)}>Desactivar</button>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  )
}
