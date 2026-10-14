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
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-summary">
            <strong>{session.correoElectronico}</strong>
            <span>{rol}</span>
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
            <h1>{menu.find((item) => item.id === activeSection)?.label || 'Inicio'}</h1>
          </div>
        </header>

        <section className="workspace">{renderSection()}</section>
      </main>
    </div>
  )
}
