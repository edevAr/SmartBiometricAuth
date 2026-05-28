import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTH_BACKGROUND_IMAGE, setupAuthBackground } from './setupAuthBackground';

describe('setupAuthBackground', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa URL por defecto si no hay variable', () => {
    vi.stubEnv('VITE_AUTH_BACKGROUND_IMAGE', '');
    const setProperty = vi.fn();
    vi.stubGlobal('document', {
      documentElement: { style: { setProperty } },
    });
    setupAuthBackground();
    expect(setProperty).toHaveBeenCalledWith(
      '--auth-bg-image',
      expect.stringContaining(DEFAULT_AUTH_BACKGROUND_IMAGE),
    );
  });

  it('escapa comillas y barras en la URL del env', () => {
    vi.stubEnv('VITE_AUTH_BACKGROUND_IMAGE', 'https://x.com/bg"pic\\a.jpg');
    const setProperty = vi.fn();
    vi.stubGlobal('document', {
      documentElement: { style: { setProperty } },
    });
    setupAuthBackground();
    const val = setProperty.mock.calls[0][1] as string;
    expect(val).toContain('\\\\');
    expect(val).toContain('\\"');
  });
});
