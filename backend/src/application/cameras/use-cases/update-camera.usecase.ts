import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Camera } from '@domain/cameras/camera.entity';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import type { UpdateCameraDto } from '../../../interfaces/http/cameras/dto/update-camera.dto';

@Injectable()
export class UpdateCameraUseCase {
  constructor(
    @Inject('CameraRepositoryPort')
    private readonly cameraRepository: CameraRepositoryPort,
  ) {}

  private encryptPassword(plain: string): string {
    return Buffer.from(plain, 'utf8').toString('base64');
  }

  async execute(id: string, adminId: string, dto: UpdateCameraDto): Promise<Camera> {
    const camera = await this.cameraRepository.findById(id);
    if (!camera || camera.adminId !== adminId) {
      throw new NotFoundException('Cámara no encontrada');
    }

    const patch: Parameters<Camera['patchConnection']>[0] = {};

    if (dto.name !== undefined) {
      const n = dto.name.trim();
      if (n.length > 0) patch.name = n;
    }
    if (dto.ipAddress !== undefined) {
      patch.ipAddress = dto.ipAddress;
    }
    if (dto.port !== undefined && dto.port !== '') {
      patch.port = Number(dto.port);
    }
    if (dto.username !== undefined) {
      const u = dto.username.trim();
      if (u.length > 0) patch.username = u;
    }
    if (dto.password !== undefined && dto.password.trim().length > 0) {
      patch.passwordEncrypted = this.encryptPassword(dto.password.trim());
    }
    if (dto.rtspPath !== undefined) {
      const r = dto.rtspPath.trim();
      if (r.length > 0) patch.rtspPath = r;
    }
    if (dto.location !== undefined) {
      patch.location = dto.location.trim() || null;
    }

    camera.patchConnection(patch);

    if (dto.isActive !== undefined) {
      camera.setActive(dto.isActive);
    }

    await this.cameraRepository.save(camera);
    return camera;
  }
}
