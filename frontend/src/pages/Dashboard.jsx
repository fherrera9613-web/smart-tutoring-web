import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fields, normalizeList } from '../services/api.js';

const NAV = [
  ['overview', 'Resumen', '◫'], ['students', 'Estudiantes', '♙'],
  ['teachers', 'Profesores', '♧'], ['families', 'Familias y cobros', '⌂'],
  ['schedule', 'Programar tutoría', '＋'], ['daily', 'Tutorías por día', '▦'],
];
const startOfWeek = (date) => { const d = new Date(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; };
const isoDate = (date) => date.toISOString().slice(0, 10);
const displayDate = (date) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'long' }).format(date);
const errorMessage = (error) => error?.message || 'No fue posible completar la operación.';
function demoCollections() {
  const today = new Date();
  const at = (hour) => { const d = new Date(today); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  return {
    students: [
      { id: 1, nombres: 'Lucía', apellidos: 'Martínez', correo: 'lucia@example.com', telefono: '8888-1101', grado: '9.º grado', estado: 'Activo' },
      { id: 2, nombres: 'Diego', apellidos: 'Rodríguez', correo: 'diego@example.com', telefono: '8888-1102', grado: '7.º grado', estado: 'Activo' },
      { id: 3, nombres: 'Sofía', apellidos: 'Hernández', correo: 'sofia@example.com', telefono: '8888-1103', grado: '10.º grado', estado: 'Activo' },
    ],
    teachers: [
      { id: 1, nombreCompleto: 'Ana Pérez', correo: 'ana@example.com', materias: 'Matemáticas', disponibilidadTexto: 'Lun–Vie · 8:00–14:00', estado: 'Disponible' },
      { id: 2, nombreCompleto: 'Carlos Méndez', correo: 'carlos@example.com', materias: 'Inglés', disponibilidadTexto: 'Lun, Mié, Vie · 9:00–17:00', estado: 'Disponible' },
    ],
    families: [
      { id: 1, nombre: 'Familia Martínez', correo: 'martinez@example.com', estudiantesTexto: 'Lucía Martínez', saldoPendiente: 120, moneda: 'NIO' },
      { id: 2, nombre: 'Familia Rodríguez', correo: 'rodriguez@example.com', estudiantesTexto: 'Diego Rodríguez', saldoPendiente: 0, moneda: 'NIO' },
    ],
    payments: [{ id: 1, fecha: isoDate(today), familiaNombre: 'Familia Rodríguez', monto: 800, moneda: 'NIO', metodo: 'Transferencia', referencia: 'DEMO-001' }],
    sessions: [
      { id: 1, fechaHora: at(9), estudianteNombre: 'Lucía Martínez', materia: 'Matemáticas', tutorNombre: 'Ana Pérez', estado: 'Confirmada' },
      { id: 2, fechaHora: at(11), estudianteNombre: 'Diego Rodríguez', materia: 'Inglés', tutorNombre: 'Carlos Méndez', estado: 'Confirmada' },
    ],
  };
}

function getId(item) { return fields(item, 'id', 'estudianteId', 'tutorId', 'familiaId', 'sesionId', 'pagoId'); }
function getStudentName(item) { return fields(item, 'nombreCompleto', 'nombre', 'nombres') + (item?.apellidos && !item?.nombreCompleto ? ` ${item.apellidos}` : ''); }
function State({ value }) { return <span className="status status-neutral"><i />{value || '—'}</span>; }
function PageTitle({ kicker, title, description, action }) { return <div className="page-title"><div><p className="eyebrow">{kicker}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>; }
function Notice({ error, onRetry }) { return error ? <div className="api-notice" role="alert"><strong>No se pudieron cargar los datos.</strong><span>{error}</span>{onRetry && <button className="button button-light" onClick={onRetry}>Reintentar</button>}</div> : null; }
function Loading() { return <div className="api-loading" role="status">Cargando datos de la API…</div>; }
function Table({ headers, rows, loading, empty = 'La API no devolvió registros.' }) {
  return <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{loading ? <tr><td className="empty-cell" colSpan={headers.length}>Cargando…</td></tr> : rows.length ? rows : <tr><td className="empty-cell" colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div>;
}
function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

export default function Dashboard({ session, role, onLogout }) {
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collections, setCollections] = useState({ students: [], teachers: [], families: [], payments: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState('');
  const [editing, setEditing] = useState(null);
  const [working, setWorking] = useState(false);
  const [schedule, setSchedule] = useState({ estudianteId: '', tutorId: '', materia: '', fechaHora: '', duracionMinutos: 60, modalidad: 'Presencial' });
  const [payment, setPayment] = useState({ familiaId: '', monto: '', fecha: isoDate(new Date()), metodo: '', referencia: '' });
  const [studentForm, setStudentForm] = useState({ nombres: '', apellidos: '', correo: '', telefono: '', fechaNacimiento: '', grado: '' });

  const range = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);
  const loadData = useCallback(async () => {
    if (session.demo) {
      setCollections(demoCollections());
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true); setError('');
    const resources = role === 'tutor' ? [
      ['sessions', 'sesiones', api.listSessions(session.token, isoDate(range.start), isoDate(range.end))],
    ] : [
      ['students', 'estudiantes', api.listStudents(session.token)],
      ['teachers', 'tutores', api.listTeachers(session.token)],
      ['families', 'familias', api.listFamilies(session.token)],
      ['payments', 'pagos', api.listPayments(session.token)],
      ['sessions', 'sesiones', api.listSessions(session.token, isoDate(range.start), isoDate(range.end))],
    ];
    const results = await Promise.allSettled(resources.map(([, , task]) => task));
    const next = {};
    const failures = [];
    results.forEach((result, index) => {
      const [key, label] = resources[index];
      if (result.status === 'fulfilled') {
        try { next[key] = normalizeList(result.value); }
        catch (parseError) { next[key] = []; failures.push(`${label}: ${errorMessage(parseError)}`); }
      } else {
        next[key] = [];
        failures.push(`${label}: ${errorMessage(result.reason)}`);
        if (result.reason?.status === 401) onLogout();
      }
    });
    setCollections((current) => Object.fromEntries(Object.keys(current).map((key) => [key, next[key] ?? (role === 'tutor' ? [] : current[key])])));
    setError(failures.length ? failures.join(' · ') : '');
    setLoading(false);
  }, [session.token, session.demo, range, role, onLogout]);

  useEffect(() => { loadData(); }, [loadData]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3500); };
  const changePage = (id) => { setActive(id); setQuery(''); setMobileOpen(false); };
  const filter = (rows, text) => rows.filter((item) => JSON.stringify(item).toLowerCase().includes(text.trim().toLowerCase()));
  const makeStudent = async (event) => {
    event.preventDefault();
    if (session.demo) { notify('Modo de prueba: los cambios no se guardan.'); return; }
    setWorking(true);
    try {
      if (editing) await api.updateStudent(session.token, getId(editing), studentForm);
      else await api.createStudent(session.token, studentForm);
      setDialog(''); setEditing(null); setStudentForm({ nombres: '', apellidos: '', correo: '', telefono: '', fechaNacimiento: '', grado: '' });
      await loadData(); notify(editing ? 'Estudiante actualizado.' : 'Estudiante registrado.');
    } catch (submitError) { notify(errorMessage(submitError)); }
    finally { setWorking(false); }
  };
  const deactivateStudent = async (student) => {
    if (session.demo) { notify('Modo de prueba: los cambios no se guardan.'); return; }
    if (!window.confirm(`¿Deseas desactivar a ${getStudentName(student)}?`)) return;
    try { await api.deactivateStudent(session.token, student); await loadData(); notify('Estudiante desactivado sin eliminar su historial.'); }
    catch (deleteError) { notify(errorMessage(deleteError)); }
  };
  const createSchedule = async (event) => {
    event.preventDefault();
    if (session.demo) { notify('Modo de prueba: los cambios no se guardan.'); return; }
    setWorking(true);
    try { await api.createSession(session.token, schedule); setSchedule({ estudianteId: '', tutorId: '', materia: '', fechaHora: '', duracionMinutos: 60, modalidad: 'Presencial' }); setDialog(''); await loadData(); notify('Tutoría programada.'); }
    catch (scheduleError) { notify(errorMessage(scheduleError)); }
    finally { setWorking(false); }
  };
  const createPayment = async (event) => {
    event.preventDefault();
    if (session.demo) { notify('Modo de prueba: los cambios no se guardan.'); return; }
    setWorking(true);
    try { await api.createPayment(session.token, { ...payment, monto: Number(payment.monto) }); setPayment({ familiaId: '', monto: '', fecha: isoDate(new Date()), metodo: '', referencia: '' }); setDialog(''); await loadData(); notify('Pago registrado.'); }
    catch (paymentError) { notify(errorMessage(paymentError)); }
    finally { setWorking(false); }
  };

  const students = collections.students;
  const teachers = collections.teachers;
  const families = collections.families;
  const payments = collections.payments;
  const sessions = collections.sessions;
  const sessionDate = (item) => new Date(fields(item, 'fechaHora', 'fecha', 'inicio'));
  const upcoming = sessions.filter((item) => sessionDate(item).toString() !== 'Invalid Date').sort((a, b) => sessionDate(a) - sessionDate(b));
  const todaysSessions = upcoming.filter((item) => isoDate(sessionDate(item)) === isoDate(new Date()));
  const pendingFamilies = families.filter((family) => Number(fields(family, 'saldoPendiente', 'saldo', 'montoPendiente')) > 0);
  const currency = families[0] ? fields(families[0], 'moneda', 'currency') || 'NIO' : 'NIO';
  const money = (amount, currencyCode = currency) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: currencyCode }).format(Number(amount) || 0);
  const totalDue = pendingFamilies.reduce((total, family) => total + Number(fields(family, 'saldoPendiente', 'saldo', 'montoPendiente') || 0), 0);
  const activePage = NAV.find(([id]) => id === active)?.[1] || 'Resumen';
  const canManage = role === 'admin' || role === 'staff';

  const studentRows = filter(students, query).map((student) => <tr key={getId(student)}><td><span className="person-cell"><span className="avatar">{initials(getStudentName(student))}</span><strong>{getStudentName(student) || 'Sin nombre'}</strong></span></td><td>{fields(student, 'correo', 'email') || '—'}</td><td>{fields(student, 'telefono', 'celular') || '—'}</td><td>{fields(student, 'grado', 'nivel') || '—'}</td><td><State value={fields(student, 'estado', 'activo') || 'Registrado'} /></td>{canManage && <td><button className="row-menu" onClick={() => { setEditing(student); setStudentForm({ nombres: fields(student, 'nombres', 'nombre') || '', apellidos: fields(student, 'apellidos') || '', correo: fields(student, 'correo', 'email') || '', telefono: fields(student, 'telefono', 'celular') || '', fechaNacimiento: fields(student, 'fechaNacimiento')?.slice(0, 10) || '', grado: fields(student, 'grado', 'nivel') || '' }); setDialog('student'); }}>Editar</button> <button className="row-menu" onClick={() => deactivateStudent(student)}>Desactivar</button></td>}</tr>);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="side-brand"><div className="brand-mark brand-small">S</div><div><strong>SMART</strong><span>Tutoring Center</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">×</button></div><div className="workspace-label">{role === 'admin' ? 'ADMINISTRACIÓN' : role === 'staff' ? 'PERSONAL ADMINISTRATIVO' : 'TUTORÍA'}</div><nav className="side-nav" aria-label="Navegación principal">{NAV.filter(([id]) => role === 'admin' || role === 'staff' || (role === 'tutor' && ['overview', 'daily'].includes(id))).map(([id, label, icon]) => <button key={id} className={`nav-item ${active === id ? 'nav-active' : ''}`} onClick={() => changePage(id)}><span className="nav-icon">{icon}</span>{label}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✦</span><strong>Conexión con API</strong><p>Los datos de estas vistas se cargan desde el servidor.</p><button onClick={loadData}>Actualizar datos <span>↻</span></button></div><div className="profile-row"><span className="avatar avatar-gold">{initials(fields(session.user, 'nombreCompleto', 'nombre', 'correo') || 'Admin')}</span><span><strong>{fields(session.user, 'nombreCompleto', 'nombre', 'correo') || 'Usuario'}</strong><small>{role === 'admin' ? 'Administrador' : role === 'staff' ? 'Personal administrativo' : 'Tutor'}</small></span></div></div></aside>
    {mobileOpen && <button aria-label="Cerrar menú" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
    <main className="main-area"><header className="topbar"><button className="menu-toggle" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>☰</button><div className="breadcrumb">SMART Tutoring Center <span>/</span><strong>{activePage}</strong></div><div className="topbar-right"><span className="today-label">{displayDate(new Date())}</span><button className="top-avatar" onClick={onLogout} title="Cerrar sesión">↪</button></div></header>
      <div className="content-area">
        {session.demo && <div className="demo-banner" role="status"><strong>Modo de prueba</strong><span>Datos de muestra; no se guardan cambios ni se llama al backend.</span></div>}
        <Notice error={error} onRetry={loadData}/>
        {loading && <Loading/>}
        {!loading && active === 'overview' && <>
          <PageTitle kicker={canManage ? 'VISTA GENERAL' : 'PORTAL DEL TUTOR'} title={`Hola, ${fields(session.user, 'nombre', 'nombreCompleto') || 'bienvenido/a'}`} description={canManage ? 'Resumen actualizado con la información disponible en la API.' : 'Tu agenda se carga desde la API del centro.'} action={canManage && <button className="button button-primary" onClick={() => changePage('schedule')}>＋ Programar tutoría</button>}/>
          {canManage ? <section className="stat-grid"><article className="stat-card"><span className="stat-label">Estudiantes</span><strong>{students.length}</strong><small>Registros obtenidos de la API</small></article><article className="stat-card"><span className="stat-label">Profesores / tutores</span><strong>{teachers.length}</strong><small>Registros obtenidos de la API</small></article><article className="stat-card"><span className="stat-label">Tutorías de esta semana</span><strong>{sessions.length}</strong><small>Agenda consultada al servidor</small></article><article className="stat-card"><span className="stat-label">Saldo por cobrar</span><strong>{money(totalDue)}</strong><small>{pendingFamilies.length} familias con saldo pendiente</small></article></section> : <section className="stat-grid"><article className="stat-card"><span className="stat-label">Tutorías de esta semana</span><strong>{sessions.length}</strong><small>Según tu agenda</small></article><article className="stat-card"><span className="stat-label">Sesiones para hoy</span><strong>{todaysSessions.length}</strong><small>Según tu agenda</small></article></section>}
          <section className="panel today-panel"><div className="panel-heading"><div><h2>Tutorías de hoy</h2><p>{displayDate(new Date())} · datos de la agenda del servidor</p></div><button className="text-button" onClick={() => changePage('daily')}>Ver agenda →</button></div><Table headers={['HORA', 'ESTUDIANTE', 'MATERIA', 'TUTOR', 'ESTADO']} loading={false} rows={todaysSessions.map((item) => { const student = fields(item, 'estudianteNombre', 'nombreEstudiante') || getStudentName(item.estudiante) || '—'; return <tr key={getId(item)}><td className="time-cell">{sessionDate(item).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</td><td>{student}</td><td>{fields(item, 'materia', 'asignatura') || '—'}</td><td>{fields(item, 'tutorNombre', 'nombreTutor') || '—'}</td><td><State value={fields(item, 'estado') || 'Programada'} /></td></tr>; })}/></section>
        </>}
        {!loading && active === 'students' && <><PageTitle kicker="GESTIÓN ACADÉMICA" title="Estudiantes" description="Registros recibidos desde GET /api/estudiantes." action={canManage && <button className="button button-primary" onClick={() => { setEditing(null); setStudentForm({ nombres: '', apellidos: '', correo: '', telefono: '', fechaNacimiento: '', grado: '' }); setDialog('student'); }}>＋ Nuevo estudiante</button>}/><section className="panel data-panel"><div className="data-toolbar"><div><h2>Estudiantes <span className="count-pill">{students.length}</span></h2><p>Crear, consultar, actualizar o desactivar registros.</p></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar estudiante…"/></label></div><Table headers={['ESTUDIANTE', 'CORREO', 'TELÉFONO', 'GRADO', 'ESTADO', ...(canManage ? ['ACCIONES'] : [])]} rows={studentRows} loading={false}/></section></>}
        {!loading && active === 'teachers' && <><PageTitle kicker="EQUIPO ACADÉMICO" title="Profesores y disponibilidad" description="Disponibilidad reportada por los tutores en la API."/><section className="panel data-panel"><div className="data-toolbar"><div><h2>Tutores <span className="count-pill">{teachers.length}</span></h2></div></div><Table headers={['TUTOR', 'CORREO', 'MATERIAS', 'DISPONIBILIDAD', 'ESTADO']} rows={filter(teachers, query).map((teacher) => { const name = getStudentName(teacher) || fields(teacher, 'nombreCompleto') || '—'; const availability = fields(teacher, 'disponibilidadTexto', 'horarioDisponible') || (Array.isArray(teacher.disponibilidad) ? teacher.disponibilidad.map((slot) => `${fields(slot, 'dia', 'diaSemana')} ${fields(slot, 'horaInicio')}–${fields(slot, 'horaFin')}`).join(', ') : '—'); return <tr key={getId(teacher)}><td><span className="person-cell"><span className="avatar avatar-purple">{initials(name)}</span><strong>{name}</strong></span></td><td>{fields(teacher, 'correo', 'email') || '—'}</td><td>{fields(teacher, 'materiasTexto', 'materias', 'especialidad') || '—'}</td><td>{availability}</td><td><State value={fields(teacher, 'estado', 'activo') || 'Activo'}/></td></tr>; })}/></section></>}
        {!loading && active === 'families' && <><PageTitle kicker="GESTIÓN FINANCIERA" title="Familias y cobros" description="Saldos y pagos recibidos desde los recursos de familias y pagos." action={canManage && <button className="button button-primary" onClick={() => setDialog('payment')}>＋ Registrar pago</button>}/><section className="metric-strip"><div><strong>{families.length}</strong><span>Familias recibidas</span></div><div><strong>{pendingFamilies.length}</strong><span>Con saldo pendiente</span></div><div><strong>{money(totalDue)}</strong><span>Total por cobrar</span></div></section><section className="panel data-panel"><div className="data-toolbar"><div><h2>Estado de cuenta por familia</h2></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar familia…"/></label></div><Table headers={['FAMILIA', 'CONTACTO', 'ESTUDIANTES', 'SALDO PENDIENTE', 'ESTADO']} rows={filter(families, query).map((family) => <tr key={getId(family)}><td>{fields(family, 'nombreCompleto', 'nombre') || '—'}</td><td>{fields(family, 'correo', 'email', 'telefono') || '—'}</td><td>{Array.isArray(family.estudiantes) ? family.estudiantes.map(getStudentName).join(', ') : fields(family, 'estudiantesTexto') || '—'}</td><td className="balance-due">{money(fields(family, 'saldoPendiente', 'saldo', 'montoPendiente') || 0, fields(family, 'moneda', 'currency') || 'NIO')}</td><td><State value={Number(fields(family, 'saldoPendiente', 'saldo', 'montoPendiente') || 0) > 0 ? 'Pendiente' : 'Al día'}/></td></tr>)}/></section><section className="panel daily-list"><div className="panel-heading"><div><h2>Historial de pagos</h2><p>Datos de GET /api/pagos</p></div></div><Table headers={['FECHA', 'FAMILIA', 'MONTO', 'MÉTODO', 'REFERENCIA']} rows={filter(payments, query).map((item) => <tr key={getId(item)}><td>{fields(item, 'fecha', 'fechaPago') ? new Date(fields(item, 'fecha', 'fechaPago')).toLocaleDateString('es-NI') : '—'}</td><td>{fields(item, 'familiaNombre', 'nombreFamilia') || '—'}</td><td>{money(fields(item, 'monto') || 0, fields(item, 'moneda', 'currency') || 'NIO')}</td><td>{fields(item, 'metodo', 'metodoPago') || '—'}</td><td>{fields(item, 'referencia') || '—'}</td></tr>)}/></section></>}
        {!loading && active === 'schedule' && <><PageTitle kicker="AGENDA ACADÉMICA" title="Programar tutoría" description="La API valida el tutor, la materia y los conflictos de horario."/><section className="panel form-panel"><form onSubmit={createSchedule}><label className="form-field"><span>Estudiante *</span><select required value={schedule.estudianteId} onChange={(event) => setSchedule({ ...schedule, estudianteId: event.target.value })}><option value="">Selecciona un estudiante</option>{students.map((student) => <option key={getId(student)} value={getId(student)}>{getStudentName(student)}</option>)}</select></label><label className="form-field"><span>Tutor *</span><select required value={schedule.tutorId} onChange={(event) => setSchedule({ ...schedule, tutorId: event.target.value })}><option value="">Selecciona un tutor</option>{teachers.map((teacher) => <option key={getId(teacher)} value={getId(teacher)}>{getStudentName(teacher) || fields(teacher, 'nombreCompleto')}</option>)}</select></label><label className="form-field"><span>Materia *</span><input required value={schedule.materia} onChange={(event) => setSchedule({ ...schedule, materia: event.target.value })}/></label><div className="form-pair"><label className="form-field"><span>Fecha y hora *</span><input required type="datetime-local" value={schedule.fechaHora} onChange={(event) => setSchedule({ ...schedule, fechaHora: event.target.value })}/></label><label className="form-field"><span>Duración (minutos)</span><input required type="number" min="15" step="15" value={schedule.duracionMinutos} onChange={(event) => setSchedule({ ...schedule, duracionMinutos: Number(event.target.value) })}/></label></div><label className="form-field"><span>Modalidad</span><select value={schedule.modalidad} onChange={(event) => setSchedule({ ...schedule, modalidad: event.target.value })}><option>Presencial</option><option>Virtual</option></select></label><div className="form-actions"><button type="submit" className="button button-primary" disabled={working}>{working ? 'Guardando…' : 'Enviar a la API y programar'}</button></div></form></section></>}
        {!loading && active === 'daily' && <><PageTitle kicker="AGENDA ACADÉMICA" title="Tutorías por día" description={`Sesiones obtenidas desde la API para la semana del ${displayDate(range.start)} al ${displayDate(range.end)}.`} action={canManage && <button className="button button-primary" onClick={() => changePage('schedule')}>＋ Programar tutoría</button>}/><section className="panel daily-list"><div className="panel-heading"><div><h2>Agenda semanal</h2><p>{sessions.length} sesiones devueltas por el servidor.</p></div><input aria-label="Filtrar por día" type="date" value={query} onChange={(event) => setQuery(event.target.value)} /></div><Table headers={['FECHA Y HORA', 'ESTUDIANTE', 'MATERIA', 'TUTOR', 'ESTADO']} rows={upcoming.filter((item) => !query || isoDate(sessionDate(item)) === query).map((item) => <tr key={getId(item)}><td className="time-cell">{sessionDate(item).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{fields(item, 'estudianteNombre', 'nombreEstudiante') || getStudentName(item.estudiante) || '—'}</td><td>{fields(item, 'materia', 'asignatura') || '—'}</td><td>{fields(item, 'tutorNombre', 'nombreTutor') || '—'}</td><td><State value={fields(item, 'estado') || 'Programada'} /></td></tr>)}/></section></>}
      </div>
      <footer className="app-footer"><span>SMART Tutoring Center · {role}</span><span><i/>API {error ? 'sin conexión' : 'conectada'}</span><button onClick={onLogout}>Cerrar sesión</button></footer>
    </main>
    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(''); }}><section className="panel modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="panel-heading"><h2 id="modal-title">{dialog === 'student' ? (editing ? 'Actualizar estudiante' : 'Registrar estudiante') : 'Registrar pago'}</h2><button className="row-menu" onClick={() => setDialog('')} aria-label="Cerrar">×</button></div>{dialog === 'student' ? <form onSubmit={makeStudent}><label className="form-field"><span>Nombres *</span><input required value={studentForm.nombres} onChange={(event) => setStudentForm({ ...studentForm, nombres: event.target.value })}/></label><label className="form-field"><span>Apellidos *</span><input required value={studentForm.apellidos} onChange={(event) => setStudentForm({ ...studentForm, apellidos: event.target.value })}/></label><label className="form-field"><span>Correo</span><input type="email" value={studentForm.correo} onChange={(event) => setStudentForm({ ...studentForm, correo: event.target.value })}/></label><label className="form-field"><span>Teléfono</span><input value={studentForm.telefono} onChange={(event) => setStudentForm({ ...studentForm, telefono: event.target.value })}/></label><div className="form-pair"><label className="form-field"><span>Fecha de nacimiento</span><input type="date" value={studentForm.fechaNacimiento} onChange={(event) => setStudentForm({ ...studentForm, fechaNacimiento: event.target.value })}/></label><label className="form-field"><span>Grado</span><input value={studentForm.grado} onChange={(event) => setStudentForm({ ...studentForm, grado: event.target.value })}/></label></div><div className="form-actions"><button className="button button-primary" disabled={working}>{working ? 'Guardando…' : 'Guardar'}</button></div></form> : <form onSubmit={createPayment}><label className="form-field"><span>Familia *</span><select required value={payment.familiaId} onChange={(event) => setPayment({ ...payment, familiaId: event.target.value })}><option value="">Selecciona una familia</option>{families.map((family) => <option key={getId(family)} value={getId(family)}>{fields(family, 'nombreCompleto', 'nombre')}</option>)}</select></label><label className="form-field"><span>Monto *</span><input required type="number" min="0.01" step="0.01" value={payment.monto} onChange={(event) => setPayment({ ...payment, monto: event.target.value })}/></label><label className="form-field"><span>Fecha *</span><input required type="date" value={payment.fecha} onChange={(event) => setPayment({ ...payment, fecha: event.target.value })}/></label><label className="form-field"><span>Método de pago</span><input value={payment.metodo} onChange={(event) => setPayment({ ...payment, metodo: event.target.value })}/></label><label className="form-field"><span>Referencia</span><input value={payment.referencia} onChange={(event) => setPayment({ ...payment, referencia: event.target.value })}/></label><div className="form-actions"><button className="button button-primary" disabled={working}>{working ? 'Guardando…' : 'Registrar pago'}</button></div></form>}</section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
