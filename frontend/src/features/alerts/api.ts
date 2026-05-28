import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../../api/httpClient';

export type AlertItem = {
  id: string;
  securityEventId: string | null;
  type: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  message: string;
  createdAt: string;
  updatedAt: string;
  cameraId?: string | null;
  /** Fotograma en base64 guardado al disparar la alerta (cámara). */
  captureImageBase64?: string | null;
  captureMimeType?: string | null;
  /** Si sigue OPEN hasta esta hora (ISO), se envía correo a contactos. */
  contactsNotifyAt?: string | null;
  /** Si existe, ya se ejecutó el envío (o el flujo) de correo a contactos. */
  contactsNotifiedAt?: string | null;
};

export type UpdateAlertPayload = {
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  message?: string;
};

export async function fetchAlerts(limit = 200): Promise<AlertItem[]> {
  const { data } = await httpClient.get<AlertItem[]>('/alerts', {
    params: { limit },
  });
  return data;
}

export async function patchAlert(id: string, payload: UpdateAlertPayload): Promise<AlertItem> {
  const { data } = await httpClient.patch<AlertItem>(`/alerts/${id}`, payload);
  return data;
}

export function useAlertsQuery() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(),
    /** Refresco más frecuente para sincronizar temporizador y envío de correos. */
    refetchInterval: 5000,
  });
}

export function useUpdateAlertMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateAlertPayload) => patchAlert(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
