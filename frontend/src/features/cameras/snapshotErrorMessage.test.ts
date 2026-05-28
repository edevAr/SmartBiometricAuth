import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { snapshotErrorMessage } from './snapshotErrorMessage';

function axiosErr(partial: {
  message?: string;
  code?: string;
  response?: { status?: number; data?: unknown };
}): AxiosError {
  return new AxiosError(
    partial.message ?? 'err',
    partial.code,
    undefined,
    undefined,
    partial.response as AxiosError['response'],
  );
}

describe('snapshotErrorMessage', () => {
  it('devuelve fallback si no es AxiosError', async () => {
    expect(await snapshotErrorMessage(new Error('x'), 'fb')).toBe('fb');
    expect(await snapshotErrorMessage('string', 'fb')).toBe('fb');
  });

  it('mensaje de timeout cuando code es ECONNABORTED', async () => {
    const err = axiosErr({ code: 'ECONNABORTED' });
    const msg = await snapshotErrorMessage(err, 'fb');
    expect(msg).toContain('Tiempo de espera');
    expect(msg).not.toBe('fb');
  });

  it('extrae message string del body JSON', async () => {
    const err = axiosErr({ response: { status: 400, data: { message: 'Cámara no disponible' } } });
    expect(await snapshotErrorMessage(err, 'fb')).toBe('Cámara no disponible');
  });

  it('une message array del body', async () => {
    const err = axiosErr({
      response: { status: 422, data: { message: ['a', 'b'] } },
    });
    expect(await snapshotErrorMessage(err, 'fb')).toBe('a, b');
  });

  it('lee JSON desde Blob en response.data', async () => {
    const blob = new Blob([JSON.stringify({ message: 'desde blob' })], {
      type: 'application/json',
    });
    const err = axiosErr({ response: { status: 500, data: blob } });
    expect(await snapshotErrorMessage(err, 'fb')).toBe('desde blob');
  });

  it('parsea string JSON con message', async () => {
    const err = axiosErr({
      response: { status: 400, data: JSON.stringify({ message: 'desde string' }) },
    });
    expect(await snapshotErrorMessage(err, 'fb')).toBe('desde string');
  });

  it('string no JSON: devuelve recorte hasta 500 caracteres', async () => {
    const long = 'x'.repeat(600);
    const err = axiosErr({ response: { status: 500, data: long } });
    expect(await snapshotErrorMessage(err, 'fb')).toBe(long.slice(0, 500));
  });

  it('sin body utilizable: fallback', async () => {
    const err = axiosErr({ response: { status: 500, data: null } });
    expect(await snapshotErrorMessage(err, 'fb')).toBe('fb');
  });
});
