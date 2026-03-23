import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Camera } from '@domain/cameras/camera.entity';
import { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import { CameraOrmEntity } from './camera.orm-entity';

@Injectable()
export class CameraRepositoryAdapter implements CameraRepositoryPort {
  constructor(
    @InjectRepository(CameraOrmEntity)
    private readonly repo: Repository<CameraOrmEntity>,
  ) {}

  async findById(id: string): Promise<Camera | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? CameraOrmEntity.toDomain(entity) : null;
  }

  async findByAdmin(adminId: string): Promise<Camera[]> {
    const entities = await this.repo.find({ where: { adminId } });
    return entities.map(CameraOrmEntity.toDomain);
  }

  async save(camera: Camera): Promise<void> {
    const entity = CameraOrmEntity.fromDomain(camera);
    await this.repo.save(entity);
  }
}

