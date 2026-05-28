import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/httpClient', () => ({
  httpClient: { get: vi.fn(), patch: vi.fn() },
}));

import { httpClient } from '../../api/httpClient';
import { fetchAlerts, patchAlert, type AlertItem } from './api';

const alert: AlertItem = {
  id: 'a1',
  securityEventId: null,
  type: 'CAMERA',
  status: 'OPEN',
  message: 'm',
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
};

describe('alerts api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAlerts GET /alerts con limit por defecto', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [alert] });
    const list = await fetchAlerts();
    expect(httpClient.get).toHaveBeenCalledWith('/alerts', { params: { limit: 200 } });
    expect(list).toEqual([alert]);
  });

  it('fetchAlerts acepta limit custom', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await fetchAlerts(50);
    expect(httpClient.get).toHaveBeenCalledWith('/alerts', { params: { limit: 50 } });
  });

  it('patchAlert PATCH /alerts/:id', async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({ data: { ...alert, status: 'RESOLVED' } });
    const out = await patchAlert('a1', { status: 'RESOLVED' });
    expect(httpClient.patch).toHaveBeenCalledWith('/alerts/a1', { status: 'RESOLVED' });
    expect(out.status).toBe('RESOLVED');
  });
});
