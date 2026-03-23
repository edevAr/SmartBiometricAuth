import type { FormEvent } from 'react';
import { useState } from 'react';
import axios from 'axios';
import { registerRequest } from '../../api/authApi';

type RegisterFormProps = {
  onBack: () => void;
  onRegistered?: () => void;
};

export function RegisterForm({ onBack, onRegistered }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const fullName = name.trim() || email.trim().split('@')[0] || 'Usuario';
    if (fullName.length < 2) {
      setError('Indica un nombre o un email válido.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Completa email y contraseña.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('Mínimo 6 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await registerRequest({
        email: email.trim(),
        password,
        fullName,
      });
      onRegistered?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string | string[] };
        const m = data?.message;
        setError(
          typeof m === 'string'
            ? m
            : Array.isArray(m)
              ? m.join(', ')
              : 'No se pudo registrar.',
        );
      } else {
        setError('Error inesperado.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="auth-brand">SecureHome AI</h1>
      <p className="auth-screen-title">Crear cuenta</p>
      <p className="auth-hint">
        Crea una cuenta con rol autorizado (requiere backend en marcha).
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">Nombre (opcional)</span>
          <input
            className="auth-input"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
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
        <label className="auth-field">
          <span className="auth-label">Contraseña</span>
          <input
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="Mín. 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Confirmar</span>
          <input
            className="auth-input"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? '…' : 'Registrarse'}
        </button>
      </form>

      <div className="auth-footer auth-footer--single">
        <button type="button" className="auth-link" onClick={onBack}>
          ← Ya tengo cuenta
        </button>
      </div>
    </>
  );
}
