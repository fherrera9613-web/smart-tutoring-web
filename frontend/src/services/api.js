const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const TOKEN_KEY = 'smart-tutoring.jwt';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    if (!session?.token) return null;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { token, method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(`No se pudo conectar con la API (${API_URL}). Revisa que el backend esté iniciado y que CORS permita el origen del frontend.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    const validation = payload?.errors && Object.values(payload.errors).flat().join(' ');
    const message = validation || payload?.detail || payload?.message || payload?.title ||
      (response.status === 401 ? 'La sesión venció o las credenciales no son válidas.' :
        response.status === 403 ? 'Tu usuario no tiene permiso para esta acción.' :
          `La API respondió con el estado ${response.status}.`);
    throw new ApiError(message, response.status, payload);
  }
  return payload;
}

const unwrap = (value) => value?.items ?? value?.data ?? value?.result ?? value;

export const api = {
  login: (correo, contrasena) => request('/api/auth/login', {
    method: 'POST', body: { correo, contrasena },
  }),
  listStudents: (token) => request('/api/estudiantes', { token }),
  createStudent: (token, student) => request('/api/estudiantes', { token, method: 'POST', body: student }),
  updateStudent: (token, id, student) => request(`/api/estudiantes/${encodeURIComponent(id)}`, { token, method: 'PUT', body: student }),
  deactivateStudent: (token, student) => request(`/api/estudiantes/${encodeURIComponent(student.id ?? student.estudianteId)}`, {
    token,
    method: 'PUT',
    body: { ...student, activo: false, estado: 'Inactivo' },
  }),
  listTeachers: (token) => request('/api/tutores', { token }),
  listFamilies: (token) => request('/api/familias', { token }),
  listPayments: (token) => request('/api/pagos', { token }),
  createPayment: (token, payment) => request('/api/pagos', { token, method: 'POST', body: payment }),
  listSessions: (token, from, to) => request(`/api/sesiones?desde=${encodeURIComponent(from)}&hasta=${encodeURIComponent(to)}`, { token }),
  createSession: (token, session) => request('/api/sesiones', { token, method: 'POST', body: session }),
  unwrap,
};

export function normalizeList(payload) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  throw new ApiError('La respuesta de la API no tiene el formato de lista esperado.', 200, payload);
}

export function getUserRole(session) {
  const raw = session?.user?.rol ?? session?.user?.role ?? session?.role ?? '';
  const role = String(raw).toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('tutor') || role.includes('profesor')) return 'tutor';
  if (role.includes('personal') || role.includes('staff') || role.includes('administrativo')) return 'staff';
  return role;
}

export function getSessionUser(payload) {
  const token = payload?.token ?? payload?.accessToken ?? payload?.jwt;
  if (!token) throw new ApiError('El endpoint de acceso respondió correctamente, pero no devolvió un JWT.');
  let claims = {};
  try { claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { /* The API response can provide user/role separately. */ }
  const roleClaim = claims.role ?? claims.roles ?? claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? '';
  const userClaim = payload?.user ?? payload?.usuario ?? {
    nombre: claims.name ?? claims.unique_name ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? '',
    correo: claims.email ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? '',
    rol: roleClaim,
  };
  return {
    token,
    user: userClaim,
    role: payload?.role ?? payload?.rol ?? userClaim?.role ?? userClaim?.rol ?? roleClaim,
    expiresAt: payload?.expiresAt ?? payload?.expiraEn ?? (claims.exp ? new Date(claims.exp * 1000).toISOString() : null),
  };
}

export function fields(value, ...names) {
  for (const name of names) {
    const result = value?.[name];
    if (result !== undefined && result !== null) return result;
  }
  return '';
}
