import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { clearSession, getSession, saveSession } from './services/api.js'

const THEME_STORAGE_KEY = 'smart-tutoring-theme'

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [session, setSession] = useState(() => getSession())
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function handleLogin(nextSession) {
    saveSession(nextSession)
    setSession(nextSession)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  if (!session) {
    return <Login onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
  }

  return (
    <Dashboard
      session={session}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
