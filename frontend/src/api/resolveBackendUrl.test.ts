import { describe, expect, it } from 'vitest';
import { buildBackendBaseUrl } from './resolveBackendUrl';

describe('buildBackendBaseUrl (unit)', () => {
  it('prioriza VITE_BACKEND_URL y quita barra final', () => {
    expect(
      buildBackendBaseUrl({
        viteBackendUrl: 'https://api.example.com/',
        dev: true,
        hostname: '192.168.1.1',
      }),
    ).toBe('https://api.example.com');
  });

  it('en dev usa hostname de la página y puerto por defecto 3000', () => {
    expect(
      buildBackendBaseUrl({
        dev: true,
        hostname: '192.168.0.31',
      }),
    ).toBe('http://192.168.0.31:3000');
  });

  it('respeta VITE_BACKEND_PORT en dev', () => {
    expect(
      buildBackendBaseUrl({
        dev: true,
        hostname: '10.0.0.5',
        backendPort: '8080',
      }),
    ).toBe('http://10.0.0.5:8080');
  });

  it('sin dev ni URL explícita cae en localhost', () => {
    expect(
      buildBackendBaseUrl({
        dev: false,
      }),
    ).toBe('http://localhost:3000');
  });
});
