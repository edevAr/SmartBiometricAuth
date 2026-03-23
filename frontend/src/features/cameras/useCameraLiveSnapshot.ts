import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { httpClient } from '../../api/httpClient';

async function snapshotErrorMessage(err: unknown, fallback: string): Promise<string> {
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
  if (d instanceof Blob) {
    try {
      const text = await d.text();
      const j = JSON.parse(text) as { message?: unknown };
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

/**
 * Poll de fotogramas vía GET /cameras/:id/snapshot (proxy en backend).
 * Revoca blob URLs al desmontar o al cambiar de cámara.
 */
export function useCameraLiveSnapshot(cameraId: string | null, intervalMs = 2200) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cameraId) {
      setImageUrl(null);
      setError(null);
      setLoading(false);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const inFlightRef = { current: false };

    const tick = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        if (!blobRef.current) {
          setLoading(true);
        }
        const { data } = await httpClient.get<Blob>(`/cameras/${cameraId}/snapshot`, {
          responseType: 'blob',
          /** El backend prueba varias URLs (lotes en paralelo); evita espera infinita en el cliente. */
          timeout: 45_000,
        });
        if (cancelled) return;
        const next = URL.createObjectURL(data);
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = next;
        setImageUrl(next);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          if (blobRef.current) {
            URL.revokeObjectURL(blobRef.current);
            blobRef.current = null;
          }
          setImageUrl(null);
          const msg = await snapshotErrorMessage(
            e,
            'No se pudo obtener la imagen en vivo. Compruebe IP, puerto (80 HTTP / 443 HTTPS), credenciales y accesibilidad desde el servidor.',
          );
          const trimmed = msg.length > 600 ? `${msg.slice(0, 600)}…` : msg;
          setError(trimmed);
        }
      } finally {
        inFlightRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [cameraId, intervalMs]);

  return { imageUrl, error, loading };
}
