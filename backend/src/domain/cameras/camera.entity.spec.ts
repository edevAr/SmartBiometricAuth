import { Camera } from './camera.entity';

describe('Camera (domain)', () => {
  const base = () =>
    Camera.createNew({
      id: 'cam-1',
      adminId: 'admin-1',
      name: 'Puerta',
      ipAddress: '10.0.0.1',
      port: 554,
      username: 'u',
      passwordEncrypted: 'e',
      rtspPath: '/stream',
      location: 'Salón',
    });

  it('createNew activa la cámara y fija fechas', () => {
    const c = base();
    expect(c.isActive).toBe(true);
    expect(c.name).toBe('Puerta');
    expect(c.location).toBe('Salón');
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
  });

  it('restore reconstruye desde props', () => {
    const c = Camera.restore('x', {
      adminId: 'a',
      name: 'n',
      ipAddress: '1.1.1.1',
      port: 80,
      username: 'u',
      passwordEncrypted: 'p',
      rtspPath: '/r',
      location: null,
      isActive: false,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-02'),
    });
    expect(c.id).toBe('x');
    expect(c.isActive).toBe(false);
  });

  it('deactivate y rename', () => {
    const c = base();
    c.deactivate();
    expect(c.isActive).toBe(false);
    c.rename('Garaje');
    expect(c.name).toBe('Garaje');
  });

  it('move actualiza ubicación', () => {
    const c = base();
    c.move(null);
    expect(c.location).toBeNull();
    c.move('  Patio  ');
    expect(c.location).toBe('  Patio  ');
  });

  it('patchConnection solo toca updatedAt si hay cambios', () => {
    const c = base();
    const before = c.updatedAt.getTime();
    c.patchConnection({});
    expect(c.updatedAt.getTime()).toBe(before);
    c.patchConnection({ port: 8554 });
    expect(c.port).toBe(8554);
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('setActive no toca si ya está en ese estado', () => {
    const c = base();
    const t = c.updatedAt.getTime();
    c.setActive(true);
    expect(c.updatedAt.getTime()).toBe(t);
    c.setActive(false);
    expect(c.isActive).toBe(false);
    c.setActive(true);
    expect(c.isActive).toBe(true);
  });
});
