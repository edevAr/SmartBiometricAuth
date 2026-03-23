import type { FormEvent } from 'react';
import { useState } from 'react';

type ForgotPasswordFormProps = {
  onBack: () => void;
};

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    // TODO: POST /auth/forgot-password
    window.setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 500);
  };

  return (
    <>
      <h1 className="auth-brand">SecureHome AI</h1>
      <p className="auth-screen-title">Recuperar contraseña</p>
      <p className="auth-hint">
        {sent
          ? 'Si existe una cuenta, recibirás un correo con los pasos.'
          : 'Indica tu email y te enviaremos un enlace para restablecerla.'}
      </p>

      {!sent ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? '…' : 'Enviar enlace'}
          </button>
        </form>
      ) : (
        <button type="button" className="auth-submit" onClick={onBack}>
          Volver al inicio de sesión
        </button>
      )}

      {!sent && (
        <div className="auth-footer auth-footer--single">
          <button type="button" className="auth-link" onClick={onBack}>
            ← Volver al inicio de sesión
          </button>
        </div>
      )}
    </>
  );
}
