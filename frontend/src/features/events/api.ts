import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../../api/httpClient';

export interface EventItem {
  id: string;
  cameraId: string;
  contactId?: string | null;
  type: string;
  detectedAt: string;
  metadataJson?: string | null;
}

async function fetchEvents(): Promise<EventItem[]> {
  const { data } = await httpClient.get<EventItem[]>('/events', {
    params: { limit: 20 },
  });
  return data;
}

export function useEventsQuery() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    refetchInterval: 5000,
  });
}

