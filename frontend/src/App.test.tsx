import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./api/authToken', () => ({
  getAuthToken: (): string | null => null,
  clearAuthToken: vi.fn(),
}));

vi.mock('./api/sessionUser', () => ({
  clearSessionUser: vi.fn(),
}));

describe('App (integración UI)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const ls: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      key: (i: number) => [...store.keys()][i] ?? null,
      removeItem: (k: string) => void store.delete(k),
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    vi.stubGlobal('localStorage', ls);
    window.history.replaceState({}, '', '/');
  });

  it('muestra pantalla de login sin JWT', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /SecureHome AI/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Entrar$/ })).toBeInTheDocument();
  });
});
