import { useState } from 'react';
import './App.css';
import { clearAuthToken } from './api/authToken';
import { AuthFlow } from './features/auth/AuthFlow';
import { DashboardLayout } from './features/app/DashboardLayout';

function App() {
  const [session, setSession] = useState(false);

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
        setSession(false);
      }}
    />
  );
}

export default App;
