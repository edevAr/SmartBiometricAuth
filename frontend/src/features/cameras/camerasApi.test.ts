import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import { httpClient } from '../../api/httpClient';
import {
  fetchCameras,
  registerCamera,
  updateCamera,
  type Camera,
} from './api';

const camera: Camera = {
  id: 'c1',
  name: 'Cam',
  ipAddress: '10.0.0.1',
  port: 554,
  username: 'u',
  rtspPath: '/stream',
  location: null,
  isActive: true,
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
};

describe('cameras api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCameras GET /cameras', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [camera] });
    const list = await fetchCameras();
    expect(httpClient.get).toHaveBeenCalledWith('/cameras');
    expect(list).toEqual([camera]);
  });

  it('registerCamera POST /cameras', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: camera });
    const out = await registerCamera({
      ipAddress: '10.0.0.1',
      username: 'u',
      password: 'p',
    });
    expect(httpClient.post).toHaveBeenCalledWith('/cameras', {
      ipAddress: '10.0.0.1',
      username: 'u',
      password: 'p',
    });
    expect(out).toEqual(camera);
  });

  it('updateCamera PATCH /cameras/:id', async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({ data: camera });
    const out = await updateCamera('c1', { name: 'N' });
    expect(httpClient.patch).toHaveBeenCalledWith('/cameras/c1', { name: 'N' });
    expect(out).toEqual(camera);
  });
});
