import { useMemo, useState } from 'react'
import OverviewSection from '../sections/OverviewSection.jsx'
import EstudiantesSection from '../sections/EstudiantesSection.jsx'
import TutoresSection from '../sections/TutoresSection.jsx'
import MateriasSection from '../sections/MateriasSection.jsx'
import SesionesSection from '../sections/SesionesSection.jsx'
import PagosSection from '../sections/PagosSection.jsx'
import UsuariosSection from '../sections/UsuariosSection.jsx'
import MisSesionesSection from '../sections/MisSesionesSection.jsx'

const ADMIN_ROLES = ['Administrador', 'PersonalAdministrativo']

function Icon({ name }) {
  const paths = {
    inicio: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></>,
    estudiantes: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v2"/><path d="M17 11a4 4 0 0 1 4 4v2"/></>,
    tutores: <><circle cx="8" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 6-6"/><path d="m16 11 2 2 4-4"/></>,
    materias: <><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z"/><path d="M8 4v16"/><path d="M12 8h4"/></>,
    sesiones: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3M8 17h5"/></>,
    pagos: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></>,
    usuarios: <><circle cx="8" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6"/><circle cx="17" cy="17" r="4"/><path d="M17 15v4M15 17h4"/></>,
    'mis-sesiones': <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 16 2 2 4-4"/></>,
  }

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.inicio}
    </svg>
  )
}

export default function Dashboard({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState('inicio')
  const rol = session?.rol

  const menu = useMemo(() => {
    if (rol === 'Tutor') {
      return [
        { id: 'inicio', label: 'Inicio' },
        { id: 'mis-sesiones', label: 'Mis sesiones' },
      ]
    }

    const items = [
      { id: 'inicio', label: 'Inicio' },
      { id: 'estudiantes', label: 'Estudiantes' },
      { id: 'tutores', label: 'Tutores' },
      { id: 'materias', label: 'Materias' },
      { id: 'sesiones', label: 'Sesiones' },
      { id: 'pagos', label: 'Pagos' },
    ]

    if (rol === 'Administrador') {
      items.push({ id: 'usuarios', label: 'Usuarios' })
    }

    return items
  }, [rol])

  function renderSection() {
    const commonProps = { onUnauthorized: onLogout }

    if (activeSection === 'inicio') {
      return <OverviewSection session={session} {...commonProps} />
    }

    if (rol === 'Tutor') {
      return <MisSesionesSection {...commonProps} />
    }

    if (!ADMIN_ROLES.includes(rol)) {
      return <OverviewSection session={session} {...commonProps} />
    }

    switch (activeSection) {
      case 'estudiantes':
        return <EstudiantesSection {...commonProps} />
      case 'tutores':
        return <TutoresSection {...commonProps} />
      case 'materias':
        return <MateriasSection {...commonProps} />
      case 'sesiones':
        return <SesionesSection {...commonProps} />
      case 'pagos':
        return <PagosSection {...commonProps} />
      case 'usuarios':
        return rol === 'Administrador'
          ? <UsuariosSection {...commonProps} />
          : <OverviewSection session={session} {...commonProps} />
      default:
        return <OverviewSection session={session} {...commonProps} />
    }
  }

  const activeLabel = menu.find((item) => item.id === activeSection)?.label || 'Inicio'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true">ST</div>
          <div>
            <strong>SMART Tutoring</strong>
            <span>Centro de tutorías</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon name={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-summary">
            <span className="user-avatar" aria-hidden="true">{session.correoElectronico?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div>
              <strong>{session.correoElectronico}</strong>
              <span>{rol}</span>
            </div>
          </div>
          <button type="button" className="button button-secondary button-block" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Sistema de gestión</p>
            <h1>{activeLabel}</h1>
          </div>
          <div className="topbar-badge" aria-label={`Rol actual: ${rol}`}>
            <span className="topbar-badge-dot" />
            {rol}
          </div>
        </header>

        <section className="workspace">{renderSection()}</section>
      </main>
    </div>
  )
}
