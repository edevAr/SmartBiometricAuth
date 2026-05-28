import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionUser,
  getSessionUser,
  mergeSessionUser,
  setSessionUser,
  type SessionUser,
} from './sessionUser';

const sample: SessionUser = {
  id: '1',
  email: 'a@b.com',
  fullName: 'A',
  role: 'ADMIN',
  isActive: true,
};

describe('sessionUser', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: vi.fn(),
      key: vi.fn(),
      get length() {
        return Object.keys(store).length;
      },
    });
  });

  it('serializa y deserializa usuario', () => {
    expect(getSessionUser()).toBeNull();
    setSessionUser(sample);
    expect(getSessionUser()).toEqual(sample);
    clearSessionUser();
    expect(getSessionUser()).toBeNull();
  });

  it('mergeSessionUser fusiona sobre el usuario actual', () => {
    setSessionUser(sample);
    mergeSessionUser({ fullName: 'Nuevo' });
    expect(getSessionUser()?.fullName).toBe('Nuevo');
  });

  it('mergeSessionUser no hace nada sin sesión', () => {
    mergeSessionUser({ fullName: 'X' });
    expect(getSessionUser()).toBeNull();
  });

  it('setSessionUser y clearSessionUser ignoran errores de storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('quota');
      },
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    setSessionUser(sample);
    clearSessionUser();
  });

  it('getSessionUser null si JSON inválido o storage falla', () => {
    store['securehome_auth_user'] = 'not-json';
    expect(getSessionUser()).toBeNull();
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('x');
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    expect(getSessionUser()).toBeNull();
  });
});
