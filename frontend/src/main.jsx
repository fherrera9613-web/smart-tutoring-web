import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import './styles/global.css';

function App() {
  const [signedIn, setSignedIn] = useState(false);
  return signedIn
    ? <Dashboard onLogout={() => setSignedIn(false)} />
    : <Login onLogin={() => setSignedIn(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
