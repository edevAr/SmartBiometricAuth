import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}));

import { httpClient } from '../../api/httpClient';
import { fetchEvents, type EventItem } from './api';

describe('events api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchEvents GET /events con limit 20', async () => {
    const events: EventItem[] = [
      {
        id: 'e1',
        cameraId: 'c1',
        type: 'MOTION',
        detectedAt: '2020-01-01',
      },
    ];
    vi.mocked(httpClient.get).mockResolvedValue({ data: events });
    const list = await fetchEvents();
    expect(httpClient.get).toHaveBeenCalledWith('/events', { params: { limit: 20 } });
    expect(list).toEqual(events);
  });
});
