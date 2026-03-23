import type { FormEvent } from 'react';
import { useState } from 'react';
import axios from 'axios';
import { loginRequest } from '../../api/authApi';

type LoginFormProps = {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
};

export function LoginForm({
  onSuccess,
  onForgotPassword,
  onCreateAccount,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginRequest(email.trim(), password);
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string | string[] };
        const m = data?.message;
        setError(
          typeof m === 'string'
            ? m
            : Array.isArray(m)
              ? m.join(', ')
              : err.code === 'ERR_NETWORK'
                ? 'No se pudo conectar con el servidor. ¿Está el backend en marcha?'
                : 'Email o contraseña incorrectos.',
        );
      } else {
        setError('Error inesperado al iniciar sesión.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="auth-brand auth-brand--spaced">SecureHome AI</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Contraseña</span>
          <input
            className="auth-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
        </label>
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? '…' : 'Entrar'}
        </button>
      </form>

      <div className="auth-footer">
        <button type="button" className="auth-link" onClick={onForgotPassword}>
          ¿Olvidaste la contraseña?
        </button>
        <button type="button" className="auth-link" onClick={onCreateAccount}>
          Crear cuenta
        </button>
      </div>
    </>
  );
}
