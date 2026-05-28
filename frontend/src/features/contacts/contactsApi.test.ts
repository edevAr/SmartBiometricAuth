import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/httpClient', () => ({
  httpClient: { post: vi.fn() },
}));

import { httpClient } from '../../api/httpClient';
import { createAuthorizedUser, userToContact, type UserApi } from './api';

const userApi: UserApi = {
  id: 'u1',
  email: 'a@b.com',
  fullName: 'Nombre',
  phone: '+1',
  relationship: 'FAMILY',
  role: 'USER',
  isActive: true,
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
};

describe('contacts api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('userToContact mapea campos y relationship por defecto', () => {
    const c = userToContact({
      ...userApi,
      relationship: null,
    });
    expect(c.id).toBe('u1');
    expect(c.name).toBe('Nombre');
    expect(c.relationship).toBe('OTHER');
    expect(c.email).toBe('a@b.com');
    expect(c.phone).toBe('+1');
    expect(c.isActive).toBe(true);
    expect(c.role).toBe('USER');
  });

  it('createAuthorizedUser POST /users y devuelve contacto', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: userApi });
    const c = await createAuthorizedUser({
      name: 'Nombre',
      relationship: 'FAMILY',
      email: '  a@b.com  ',
      phone: ' +1 ',
    });
    expect(httpClient.post).toHaveBeenCalledWith('/users', {
      email: 'a@b.com',
      fullName: 'Nombre',
      relationship: 'FAMILY',
      phone: '+1',
    });
    expect(c.id).toBe('u1');
    expect(c.name).toBe('Nombre');
  });

  it('createAuthorizedUser sin email lanza', async () => {
    await expect(
      createAuthorizedUser({ name: 'N', relationship: 'X', email: '   ' }),
    ).rejects.toThrow('email es obligatorio');
    await expect(
      createAuthorizedUser({ name: 'N', relationship: 'X' }),
    ).rejects.toThrow('email es obligatorio');
  });
});
