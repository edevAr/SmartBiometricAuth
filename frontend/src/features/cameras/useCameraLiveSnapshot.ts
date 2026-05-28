import { useEffect, useRef, useState } from 'react';
import { httpClient } from '../../api/httpClient';
import { snapshotErrorMessage } from './snapshotErrorMessage';

/**
 * Poll de fotogramas vía GET /cameras/:id/snapshot (proxy en backend).
 * Revoca blob URLs al desmontar o al cambiar de cámara.
 * @param intervalMs por defecto 1s; más bajo = más carga en cámara/servidor (no afecta al intervalo del monitor ML en backend).
 */
export function useCameraLiveSnapshot(cameraId: string | null, intervalMs = 1000) {
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
