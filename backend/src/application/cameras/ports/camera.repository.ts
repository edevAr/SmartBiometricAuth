import { Camera } from '@domain/cameras/camera.entity';

export interface CameraRepositoryPort {
  findById(id: string): Promise<Camera | null>;
  findByAdmin(adminId: string): Promise<Camera[]>;
  save(camera: Camera): Promise<void>;
}

