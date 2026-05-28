import { useState } from 'react';
import './App.css';
import { clearAuthToken, getAuthToken } from './api/authToken';
import { clearSessionUser } from './api/sessionUser';
import { AuthFlow } from './features/auth/AuthFlow';
import { DashboardLayout } from './features/app/DashboardLayout';
import { EmergencyLocationPage } from './features/emergency/EmergencyLocationPage';

function App() {
  /** Si hay JWT guardado (localStorage), mantener sesión tras F5 / recargar pestaña. */
  const [session, setSession] = useState(() => Boolean(getAuthToken()));

  /** Enlace desde correo de alerta: sin login, muestra mapa / dirección del hogar. */
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('emergency') === '1') {
      return <EmergencyLocationPage />;
    }
  }

  if (!session) {
    return (
      <div className="auth-root">
        <AuthFlow onLoginSuccess={() => setSession(true)} />
      </div>
    );
  }

  return (
    <DashboardLayout
      onLogout={() => {
        clearAuthToken();
        clearSessionUser();
        setSession(false);
      }}
    />
  );
}

export default App;
