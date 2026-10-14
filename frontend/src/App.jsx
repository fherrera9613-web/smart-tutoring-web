import { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { clearSession, getSession, saveSession } from './services/api.js'

export default function App() {
  const [session, setSession] = useState(() => getSession())

  function handleLogin(nextSession) {
    saveSession(nextSession)
    setSession(nextSession)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  if (!session) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}
