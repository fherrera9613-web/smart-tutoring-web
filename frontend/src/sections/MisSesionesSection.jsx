import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { resolveErrorMessage } from '../utils/errors.js'

export default function MisSesionesSection({ onUnauthorized }) {
  const [sesiones, setSesiones] = useState([])
  const [selected, setSelected] = useState(null)
  const [attendance, setAttendance] = useState({ estadoAsistencia: 'Presente', observaciones: '' })
  const [tracking, setTracking] = useState({ temaTrabajado: '', observaciones: '' })
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api.sesiones.misSesiones()
      setSesiones(data)
      if (selected) {
        setSelected(data.find((item) => item.idSesion === selected.idSesion) || null)
      }
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function chooseSession(item) {
    setSelected(item)
    setHistory(null)
    setError('')
    setSuccess('')
    setAttendance({ estadoAsistencia: 'Presente', observaciones: '' })
    setTracking({ temaTrabajado: '', observaciones: '' })
  }

  async function registerAttendance(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.sesiones.registrarAsistencia(selected.idSesion, attendance)
      setSuccess('Asistencia registrada correctamente.')
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  async function registerTracking(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.sesiones.registrarSeguimiento(selected.idSesion, tracking)
      setSuccess('Seguimiento académico registrado correctamente.')
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  async function completeSession() {
    setError('')
    setSuccess('')
    try {
      await api.sesiones.completar(selected.idSesion)
      setSuccess('Sesión completada correctamente.')
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  async function showHistory() {
    setError('')
    setHistory(null)
    try {
      setHistory(await api.estudiantes.historialAcademico(selected.idEstudiante))
    } catch (err) {
      setError(resolveErrorMessage(err, onUnauthorized))
    }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Mis sesiones</h2><p className="muted">Sesiones asignadas al tutor autenticado.</p></div></div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel table-panel">
        {loading ? <p>Cargando sesiones…</p> : sesiones.length === 0 ? <p className="muted">No tiene sesiones asignadas.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Estudiante</th><th>Materia</th><th>Estado</th><th></th></tr></thead><tbody>
            {sesiones.map((item) => (
              <tr key={item.idSesion}>
                <td>{item.fecha}</td><td>{item.horaInicio?.slice(0, 5)}–{item.horaFin?.slice(0, 5)}</td><td>{item.nombreEstudiante}</td><td>{item.nombreMateria}</td><td><span className={`status status-${String(item.estado).toLowerCase()}`}>{item.estado}</span></td><td><button className="button button-small button-secondary" type="button" onClick={() => chooseSession(item)}>Ver detalle</button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      {selected && (
        <div className="panel detail-panel">
          <div className="section-heading compact"><div><h3>Sesión #{selected.idSesion}</h3><p className="muted">{selected.nombreEstudiante} · {selected.nombreMateria} · {selected.fecha} {selected.horaInicio?.slice(0, 5)}</p></div><div className="form-actions"><button className="button button-ghost" type="button" onClick={showHistory}>Historial del estudiante</button><button className="button button-secondary" type="button" onClick={() => { setSelected(null); setHistory(null) }}>Cerrar</button></div></div>

          {selected.estado === 'Programada' ? (
            <div className="two-column">
              <form className="subpanel form-stack" onSubmit={registerAttendance}>
                <h4>Registrar asistencia</h4>
                <label>Estado<select value={attendance.estadoAsistencia} onChange={(event) => setAttendance((current) => ({ ...current, estadoAsistencia: event.target.value }))}><option value="Presente">Presente</option><option value="Ausente">Ausente</option></select></label>
                <label>Observaciones<textarea rows="3" value={attendance.observaciones} onChange={(event) => setAttendance((current) => ({ ...current, observaciones: event.target.value }))} /></label>
                <button className="button button-primary" type="submit">Guardar asistencia</button>
              </form>

              <form className="subpanel form-stack" onSubmit={registerTracking}>
                <h4>Seguimiento académico</h4>
                <label>Tema trabajado<input value={tracking.temaTrabajado} onChange={(event) => setTracking((current) => ({ ...current, temaTrabajado: event.target.value }))} required /></label>
                <label>Observaciones<textarea rows="3" value={tracking.observaciones} onChange={(event) => setTracking((current) => ({ ...current, observaciones: event.target.value }))} required /></label>
                <button className="button button-primary" type="submit">Guardar seguimiento</button>
              </form>

              <div className="span-2 completion-box"><div><strong>Completar sesión</strong><p className="muted">La API validará hora de finalización, asistencia y seguimiento requerido.</p></div><button className="button button-success" type="button" onClick={completeSession}>Marcar como completada</button></div>
            </div>
          ) : <p className="muted">Esta sesión ya no admite registros porque su estado es {selected.estado}.</p>}
        </div>
      )}

      {history && (
        <div className="panel">
          <h3>Historial académico — {history.nombreEstudiante}</h3>
          {history.sesiones?.length ? <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Materia</th><th>Estado</th><th>Asistencia</th><th>Tema</th><th>Observaciones</th></tr></thead><tbody>{history.sesiones.map((row) => <tr key={row.idSesion}><td>{row.fecha}</td><td>{row.nombreMateria}</td><td>{row.estadoSesion}</td><td>{row.estadoAsistencia || '—'}</td><td>{row.temaTrabajado || '—'}</td><td>{row.observacionesAcademicas || '—'}</td></tr>)}</tbody></table></div> : <p className="muted">No hay registros en el historial.</p>}
        </div>
      )}
    </div>
  )
}
