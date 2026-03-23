import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '@domain/events/event.entity';
import { EventRepositoryPort } from '@application/events/ports/event.repository';
import { EventOrmEntity } from './event.orm-entity';
import { CameraOrmEntity } from './camera.orm-entity';

@Injectable()
export class EventRepositoryAdapter implements EventRepositoryPort {
  constructor(
    @InjectRepository(EventOrmEntity)
    private readonly repo: Repository<EventOrmEntity>,
    @InjectRepository(CameraOrmEntity)
    private readonly cameraRepo: Repository<CameraOrmEntity>,
  ) {}

  async findById(id: string): Promise<Event | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? EventOrmEntity.toDomain(entity) : null;
  }

  async findLatestByAdmin(adminId: string, limit: number): Promise<Event[]> {
    const qb = this.repo
      .createQueryBuilder('event')
      .innerJoin(CameraOrmEntity, 'camera', 'camera.id = event.camera_id')
      .where('camera.admin_id = :adminId', { adminId })
      .orderBy('event.detected_at', 'DESC')
      .limit(limit);

    const entities = await qb.getMany();
    return entities.map(EventOrmEntity.toDomain);
  }

  async save(event: Event): Promise<void> {
    const entity = EventOrmEntity.fromDomain(event);
    await this.repo.save(entity);
  }
}

