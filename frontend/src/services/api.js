const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5008'
const SESSION_KEY = 'smartTutoringSession'

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.token) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    if (session.expiraEn) {
      const expiration = new Date(session.expiraEn)
      if (!Number.isNaN(expiration.getTime()) && expiration <= new Date()) {
        localStorage.removeItem(SESSION_KEY)
        return null
      }
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) }
export function clearSession() { localStorage.removeItem(SESSION_KEY) }

function getValidationMessage(data) {
  if (!data?.errors || typeof data.errors !== 'object') return null
  for (const messages of Object.values(data.errors)) {
    if (Array.isArray(messages) && messages.length > 0) return messages[0]
  }
  return null
}

async function request(path, options = {}) {
  const { method = 'GET', body, auth = true } = options
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const session = getSession()
    if (!session?.token) throw new ApiError('La sesión ha expirado. Inicie sesión nuevamente.', 401)
    headers.Authorization = `Bearer ${session.token}`
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('No fue posible conectarse con el servidor. Verifique que la API esté en ejecución.', 0)
  }

  if (response.status === 204) return null
  const text = await response.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) clearSession()
    const message = data?.mensaje || getValidationMessage(data) || data?.title ||
      (typeof data === 'string' ? data : null) || `La solicitud falló con código ${response.status}.`
    throw new ApiError(message, response.status, data)
  }
  return data
}

async function downloadAuthorizedCsv(path) {
  const session = getSession()
  if (!session?.token) throw new ApiError('La sesión ha expirado. Inicie sesión nuevamente.', 401)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${session.token}`, Accept: 'text/csv' },
    })
  } catch {
    throw new ApiError('No fue posible conectarse con el servidor para exportar el reporte.', 0)
  }
  if (!response.ok) {
    if (response.status === 401) clearSession()
    throw new ApiError(`No fue posible generar el reporte (HTTP ${response.status}).`, response.status)
  }
  return response.blob()
}

export const api = {
  login: (correoElectronico, password) => request('/api/auth/login', { method: 'POST', auth: false, body: { correoElectronico, password } }),
  estudiantes: {
    listar: () => request('/api/estudiantes'),
    obtener: (id) => request(`/api/estudiantes/${id}`),
    crear: (data) => request('/api/estudiantes', { method: 'POST', body: data }),
    actualizar: (id, data) => request(`/api/estudiantes/${id}`, { method: 'PUT', body: data }),
    historialAcademico: (id) => request(`/api/estudiantes/${id}/historial-academico`),
  },
  tutores: {
    listar: () => request('/api/tutores'),
    obtener: (id) => request(`/api/tutores/${id}`),
    crear: (data) => request('/api/tutores', { method: 'POST', body: data }),
    actualizar: (id, data) => request(`/api/tutores/${id}`, { method: 'PUT', body: data }),
    asignarMateria: (idTutor, idMateria) => request(`/api/tutores/${idTutor}/materias/${idMateria}`, { method: 'POST' }),
    disponibilidad: (idTutor, fecha = '') => request(`/api/tutores/${idTutor}/disponibilidad${fecha ? `?fecha=${fecha}` : ''}`),
    espaciosLibres: (idTutor, fecha) => request(`/api/tutores/${idTutor}/disponibilidad/libres?fecha=${encodeURIComponent(fecha)}`),
    guardarHorarios: (idTutor, horarios) => request(`/api/tutores/${idTutor}/disponibilidad/horarios`, { method: 'PUT', body: { horarios } }),
    bloquearHorario: (idTutor, datos) => request(`/api/tutores/${idTutor}/disponibilidad/bloqueos`, { method: 'POST', body: datos }),
    eliminarBloqueo: (idTutor, idBloqueo) => request(`/api/tutores/${idTutor}/disponibilidad/bloqueos/${idBloqueo}`, { method: 'DELETE' }),
  },
  materias: {
    listar: () => request('/api/materias'),
    obtener: (id) => request(`/api/materias/${id}`),
    crear: (data) => request('/api/materias', { method: 'POST', body: data }),
    actualizar: (id, data) => request(`/api/materias/${id}`, { method: 'PUT', body: data }),
    eliminar: (id) => request(`/api/materias/${id}`, { method: 'DELETE' }),
  },
  sesiones: {
    listar: () => request('/api/sesiones'),
    agenda: (idTutor, fecha, pagina = 1, tamanio = 50) => request(`/api/sesiones/agenda?${new URLSearchParams({ idTutor: String(idTutor), ...(fecha ? { fecha } : {}), pagina: String(pagina), tamanio: String(tamanio) })}`),
    misSesiones: () => request('/api/sesiones/mis-sesiones'),
    obtener: (id) => request(`/api/sesiones/${id}`),
    crear: (data) => request('/api/sesiones', { method: 'POST', body: data }),
    reprogramar: (id, data) => request(`/api/sesiones/${id}`, { method: 'PUT', body: data }),
    cancelar: (id) => request(`/api/sesiones/${id}/cancelar`, { method: 'PATCH' }),
    registrarAsistencia: (id, data) => request(`/api/sesiones/${id}/asistencia`, { method: 'POST', body: data }),
    registrarSeguimiento: (id, data) => request(`/api/sesiones/${id}/seguimiento`, { method: 'POST', body: data }),
    completar: (id) => request(`/api/sesiones/${id}/completar`, { method: 'PATCH' }),
  },
  pagos: {
    tarifa: () => request('/api/pagos/tarifa'),
    pendientes: (pagina = 1, tamanio = 20, buscar = '', idEstudiante = '') => request(`/api/pagos/pendientes?${new URLSearchParams({ pagina: String(pagina), tamanio: String(tamanio), ...(buscar.trim() ? { buscar: buscar.trim() } : {}), ...(idEstudiante ? { idEstudiante: String(idEstudiante) } : {}) })}`),
    listar: () => request('/api/pagos'),
    resumen: () => request('/api/pagos/resumen'),
    exportarCsv: (desde, hasta) => downloadAuthorizedCsv(`/api/pagos/reporte.csv?${new URLSearchParams({ desde, hasta })}`),
    crear: (data) => request('/api/pagos', { method: 'POST', body: data }),
    porEstudiante: (idEstudiante) => request(`/api/pagos/estudiante/${idEstudiante}`),
  },
  usuarios: {
    listar: () => request('/api/usuarios'),
    obtener: (id) => request(`/api/usuarios/${id}`),
    crear: (data) => request('/api/usuarios', { method: 'POST', body: data }),
    actualizar: (id, data) => request(`/api/usuarios/${id}`, { method: 'PUT', body: data }),
    desactivar: (id) => request(`/api/usuarios/${id}/desactivar`, { method: 'PATCH' }),
  },
}

export { API_URL }
