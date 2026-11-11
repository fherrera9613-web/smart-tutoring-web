import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api.js'
import { getLocalIsoDate } from '../utils/date.js'
import { resolveErrorMessage } from '../utils/errors.js'

const moneda = new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' })

export default function LiquidacionesTutoresSection({ onUnauthorized, isAdministrator }) {
  const [sesiones, setSesiones] = useState([])
  const [liquidaciones, setLiquidaciones] = useState([])
  const [idSesion, setIdSesion] = useState('')
  const [montoNio, setMontoNio] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaPago, setFechaPago] = useState(getLocalIsoDate())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function cargar() {
    const [s, l] = await Promise.all([api.sesiones.listar(), api.liquidaciones.listar()])
    setSesiones(s)
    setLiquidaciones(l)
  }

  useEffect(() => {
    cargar().catch((e) => setError(resolveErrorMessage(e, onUnauthorized))).finally(() => setLoading(false))
  }, [])

  const pendientes = useMemo(() => {
    const existentes = new Set(liquidaciones.map((l) => Number(l.idSesion)))
    return sesiones.filter((s) => s.estado === 'Completada' && !existentes.has(Number(s.idSesion)))
  }, [sesiones, liquidaciones])

  async function crear(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.liquidaciones.crear({ idSesion: Number(idSesion), montoNio: Number(montoNio), observaciones: observaciones.trim() || null })
      setIdSesion('')
      setMontoNio('')
      setObservaciones('')
      await cargar()
      setSuccess('Liquidación pendiente de aprobación registrada.')
    } catch (e) { setError(resolveErrorMessage(e, onUnauthorized)) }
    finally { setSaving(false) }
  }

  async function cambiar(id, accion) {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      if (accion === 'aprobar') {
        await api.liquidaciones.aprobar(id)
        setSuccess('Liquidación aprobada.')
      } else {
        await api.liquidaciones.registrarPago(id, fechaPago)
        setSuccess('Pago registrado administrativamente. No se hizo ninguna transferencia.')
      }
      await cargar()
    } catch (e) { setError(resolveErrorMessage(e, onUnauthorized)) }
    finally { setSaving(false) }
  }

  return (
    <div className="section-stack">
      <div className="section-heading"><div><h2>Liquidaciones a tutores</h2><p className="muted">Registre el importe acordado por sesión, solicite aprobación y confirme el pago efectuado fuera de la plataforma.</p></div></div>
      <div className="panel note-panel">El sistema no determina automáticamente la remuneración del tutor porque no existe una tarifa contractual verificada. Solo se admiten sesiones completadas con asistencia presente. La aprobación y confirmación corresponden al administrador.</div>
      <form className="panel form-grid" onSubmit={crear}>
        <label className="span-2">Sesión completada
          <select required value={idSesion} onChange={(e) => setIdSesion(e.target.value)}>
            <option value="">Seleccione una sesión</option>
            {pendientes.map((s) => <option value={s.idSesion} key={s.idSesion}>{s.fecha} · {s.nombreTutor} · {s.nombreMateria} · {s.nombreEstudiante}</option>)}
          </select>
        </label>
        <label>Monto acordado (C$)<input type="number" required min="0.01" max="1000000" step="0.01" value={montoNio} onChange={(e) => setMontoNio(e.target.value)} /></label>
        <label className="span-2">Observaciones<input value={observaciones} maxLength={500} onChange={(e) => setObservaciones(e.target.value)} placeholder="Referencia al acuerdo de remuneración" /></label>
        <div className="form-actions span-2"><button className="button button-primary" disabled={saving || !idSesion || Number(montoNio) <= 0} type="submit">Registrar para aprobación</button></div>
      </form>
      {isAdministrator && <div className="panel"><label>Fecha de pago realizado<input type="date" value={fechaPago} max={getLocalIsoDate()} onChange={(e) => setFechaPago(e.target.value)} /></label><p className="muted">Esta fecha se utilizará al marcar como pagada una liquidación aprobada.</p></div>}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="panel table-panel">
        {loading ? <p>Cargando liquidaciones…</p> : liquidaciones.length === 0 ? <p className="muted">No hay liquidaciones registradas.</p> :
          <div className="table-wrap"><table><thead><tr><th>Sesión</th><th>Tutor</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
            {liquidaciones.map((item) => <tr key={item.idLiquidacion}>
              <td>{item.fecha} · {item.nombreMateria}</td><td>{item.nombreTutor}</td><td>{moneda.format(item.montoNio)}</td><td>{item.estado}</td>
              <td className="actions-cell">{isAdministrator && item.estado === 'Pendiente' ?
                <button className="button button-small button-primary" type="button" disabled={saving} onClick={() => cambiar(item.idLiquidacion, 'aprobar')}>Aprobar</button>
                : isAdministrator && item.estado === 'Aprobada' ?
                <button className="button button-small button-secondary" type="button" disabled={saving || !fechaPago} onClick={() => cambiar(item.idLiquidacion, 'pagar')}>Registrar pago</button>
                : <span className="muted">{item.fechaPago || 'Sin acción'}</span>}</td>
            </tr>)}
          </tbody></table></div>}
      </div>
    </div>
  )
}
