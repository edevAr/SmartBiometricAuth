import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Camera } from '@domain/cameras/camera.entity';
import { UpdateCameraUseCase } from './update-camera.usecase';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';

function sampleCam(adminId: string) {
  return Camera.createNew({
    id: 'cam-x',
    adminId,
    name: 'Old',
    ipAddress: '10.0.0.1',
    port: 554,
    username: 'u',
    passwordEncrypted: 'old',
    rtspPath: '/old',
  });
}

describe('UpdateCameraUseCase', () => {
  it('lanza NotFoundException si no existe o no es del admin', async () => {
    const repo: CameraRepositoryPort = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    } as never;

    const uc = (
      await Test.createTestingModule({
        providers: [
          UpdateCameraUseCase,
          { provide: 'CameraRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(UpdateCameraUseCase);

    await expect(uc.execute('id', 'admin', { name: 'N' })).rejects.toBeInstanceOf(NotFoundException);

    const cam = sampleCam('other');
    (repo.findById as jest.Mock).mockResolvedValue(cam);
    await expect(uc.execute(cam.id, 'admin', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aplica parches, contraseña y isActive', async () => {
    const cam = sampleCam('admin-1');
    const save = jest.fn().mockImplementation(async (c: Camera) => c);
    const repo: CameraRepositoryPort = {
      findById: jest.fn().mockResolvedValue(cam),
      save,
    } as never;

    const uc = (
      await Test.createTestingModule({
        providers: [
          UpdateCameraUseCase,
          { provide: 'CameraRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(UpdateCameraUseCase);

    await uc.execute(cam.id, 'admin-1', {
      name: '  Nueva  ',
      ipAddress: '10.0.0.2',
      port: '8554',
      username: '  user  ',
      password: '  pwd  ',
      rtspPath: '  /path  ',
      location: '  Lugar  ',
      isActive: false,
    });

    expect(cam.name).toBe('Nueva');
    expect(cam.ipAddress).toBe('10.0.0.2');
    expect(cam.port).toBe(8554);
    expect(cam.username).toBe('user');
    expect(Buffer.from(cam.passwordEncrypted, 'base64').toString('utf8')).toBe('pwd');
    expect(cam.rtspPath).toBe('/path');
    expect(cam.location).toBe('Lugar');
    expect(cam.isActive).toBe(false);
  });

  it('solo isActive sin tocar conexión', async () => {
    const cam = sampleCam('a');
    const repo: CameraRepositoryPort = {
      findById: jest.fn().mockResolvedValue(cam),
      save: jest.fn().mockImplementation(async (c: Camera) => c),
    } as never;
    const uc = (
      await Test.createTestingModule({
        providers: [
          UpdateCameraUseCase,
          { provide: 'CameraRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(UpdateCameraUseCase);
    await uc.execute(cam.id, 'a', { isActive: false });
    expect(cam.isActive).toBe(false);
  });

  it('ignora name/username vacíos y password vacío', async () => {
    const cam = sampleCam('a');
    const nameBefore = cam.name;
    const userBefore = cam.username;
    const repo: CameraRepositoryPort = {
      findById: jest.fn().mockResolvedValue(cam),
      save: jest.fn().mockImplementation(async (c: Camera) => c),
    } as never;

    const uc = (
      await Test.createTestingModule({
        providers: [
          UpdateCameraUseCase,
          { provide: 'CameraRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(UpdateCameraUseCase);

    await uc.execute(cam.id, 'a', {
      name: '   ',
      username: '',
      password: '   ',
      port: '',
      location: '',
    });

    expect(cam.name).toBe(nameBefore);
    expect(cam.username).toBe(userBefore);
    expect(cam.location).toBeNull();
  });
});
