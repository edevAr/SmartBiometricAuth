import { Test } from '@nestjs/testing';
import { RegisterCameraUseCase } from './register-camera.usecase';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';

describe('RegisterCameraUseCase', () => {
  it('cifra contraseña en base64 y persiste', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo: CameraRepositoryPort = {
      save,
      findById: jest.fn(),
      findByAdmin: jest.fn(),
    };

    const uc = await Test.createTestingModule({
      providers: [
        RegisterCameraUseCase,
        { provide: 'CameraRepositoryPort', useValue: repo },
      ],
    }).compile();

    const useCase = uc.get(RegisterCameraUseCase);
    const cam = await useCase.execute({
      adminId: 'admin-1',
      name: 'Cam',
      ipAddress: '192.168.1.1',
      port: 554,
      username: 'root',
      passwordPlain: 'secret',
      rtspPath: '/live',
      location: 'Hall',
    });

    expect(save).toHaveBeenCalledWith(cam);
    expect(Buffer.from(cam.passwordEncrypted, 'base64').toString('utf8')).toBe('secret');
    expect(cam.adminId).toBe('admin-1');
  });
});
