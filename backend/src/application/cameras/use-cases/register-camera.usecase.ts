import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Camera } from '@domain/cameras/camera.entity';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';

export interface RegisterCameraCommand {
  adminId: string;
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  passwordPlain: string;
  rtspPath: string;
  location?: string | null;
}

@Injectable()
export class RegisterCameraUseCase {
  constructor(
    @Inject('CameraRepositoryPort')
    private readonly cameraRepository: CameraRepositoryPort,
  ) {}

  // MVP: simulamos "cifrado" con base64; en fases siguientes usaremos KMS/real crypto.
  private encryptPassword(plain: string): string {
    return Buffer.from(plain, 'utf8').toString('base64');
  }

  async execute(command: RegisterCameraCommand): Promise<Camera> {
    const camera = Camera.createNew({
      id: randomUUID(),
      adminId: command.adminId,
      name: command.name,
      ipAddress: command.ipAddress,
      port: command.port,
      username: command.username,
      passwordEncrypted: this.encryptPassword(command.passwordPlain),
      rtspPath: command.rtspPath,
      location: command.location,
    });

    await this.cameraRepository.save(camera);
    return camera;
  }
}

