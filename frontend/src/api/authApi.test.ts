import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./httpClient', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('./authToken', () => ({
  setAuthToken: vi.fn(),
}));

vi.mock('./sessionUser', () => ({
  setSessionUser: vi.fn(),
}));

import { httpClient } from './httpClient';
import { setAuthToken } from './authToken';
import { setSessionUser } from './sessionUser';
import { fetchMe, loginRequest, registerRequest } from './authApi';

const user = {
  id: 'u1',
  email: 'a@b.com',
  fullName: 'A',
  role: 'ADMIN',
  isActive: true,
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(httpClient.post).mockResolvedValue({
      data: { access_token: 'jwt', user },
    });
    vi.mocked(httpClient.get).mockResolvedValue({ data: user });
  });

  it('loginRequest envía credenciales y guarda sesión', async () => {
    const res = await loginRequest('A@B.COM', 'secret');
    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'A@B.COM',
      password: 'secret',
    });
    expect(setAuthToken).toHaveBeenCalledWith('jwt');
    expect(setSessionUser).toHaveBeenCalledWith(user);
    expect(res.access_token).toBe('jwt');
  });

  it('registerRequest registra y guarda sesión', async () => {
    await registerRequest({
      email: 'n@test.com',
      password: 'pw',
      fullName: 'N',
      phone: '+1',
    });
    expect(httpClient.post).toHaveBeenCalledWith('/auth/register', {
      email: 'n@test.com',
      password: 'pw',
      fullName: 'N',
      phone: '+1',
    });
    expect(setAuthToken).toHaveBeenCalled();
  });

  it('fetchMe obtiene perfil y actualiza sesión', async () => {
    const me = await fetchMe();
    expect(httpClient.get).toHaveBeenCalledWith('/auth/me');
    expect(setSessionUser).toHaveBeenCalledWith(user);
    expect(me.email).toBe('a@b.com');
  });
});
