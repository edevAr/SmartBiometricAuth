import axios from 'axios';

async function readBlobAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
    fr.readAsText(blob);
  });
}

/**
 * Mensaje legible para errores al obtener snapshot de cámara (blob / JSON / timeout).
 */
export async function snapshotErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (!axios.isAxiosError(err)) return fallback;
  if (err.code === 'ECONNABORTED') {
    return 'Tiempo de espera: el servidor tardó demasiado en obtener la imagen. Compruebe la cámara y la red.';
  }
  const d = err.response?.data as unknown;
  if (d == null) return fallback;
  if (typeof d === 'object' && d !== null && 'message' in d) {
    const m = (d as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  let blobText: string | null = null;
  try {
    if (typeof Blob !== 'undefined' && d instanceof Blob) {
      blobText = await readBlobAsText(d);
    } else if (
      typeof d === 'object' &&
      d !== null &&
      typeof (d as { text?: unknown }).text === 'function'
    ) {
      blobText = await (d as { text: () => Promise<string> }).text();
    }
  } catch {
    blobText = null;
  }
  if (blobText != null) {
    try {
      const j = JSON.parse(blobText) as { message?: unknown };
      if (typeof j.message === 'string') return j.message;
    } catch {
      /* ignore */
    }
  }
  if (typeof d === 'string') {
    try {
      const j = JSON.parse(d) as { message?: unknown };
      if (typeof j.message === 'string') return j.message;
    } catch {
      return d.slice(0, 500);
    }
  }
  return fallback;
}
