import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { RegisterForm } from './RegisterForm';

export type AuthScreen = 'login' | 'forgot' | 'register';

type AuthFlowProps = {
  onLoginSuccess: () => void;
};

export function AuthFlow({ onLoginSuccess }: AuthFlowProps) {
  const [screen, setScreen] = useState<AuthScreen>('login');

  return (
    <main className="auth-container">
      <div className="auth-card" key={screen}>
        {screen === 'login' && (
          <LoginForm
            onSuccess={onLoginSuccess}
            onForgotPassword={() => setScreen('forgot')}
            onCreateAccount={() => setScreen('register')}
          />
        )}
        {screen === 'forgot' && (
          <ForgotPasswordForm onBack={() => setScreen('login')} />
        )}
        {screen === 'register' && (
          <RegisterForm
            onBack={() => setScreen('login')}
            onRegistered={() => setScreen('login')}
          />
        )}
      </div>
    </main>
  );
}
