import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthToken, getAuthToken, setAuthToken } from './authToken';

describe('authToken', () => {
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
      clear: () => {
        store = {};
      },
      key: () => null,
      get length() {
        return Object.keys(store).length;
      },
    });
  });

  it('guarda y lee el token', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('abc');
    expect(getAuthToken()).toBe('abc');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('devuelve null si localStorage lanza', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    expect(getAuthToken()).toBeNull();
    setAuthToken('x');
    clearAuthToken();
  });
});
