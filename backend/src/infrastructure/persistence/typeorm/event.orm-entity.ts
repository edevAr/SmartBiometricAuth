import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event, EventProps, EventType } from '@domain/events/event.entity';
import { CameraOrmEntity } from './camera.orm-entity';

@Entity('events')
export class EventOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'camera_id', type: 'uuid' })
  cameraId!: string;

  @ManyToOne(() => CameraOrmEntity)
  @JoinColumn({ name: 'camera_id' })
  camera!: CameraOrmEntity;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  type!: EventType;

  @CreateDateColumn({ name: 'detected_at' })
  detectedAt!: Date;

  @Column({ name: 'metadata_json', type: 'text', nullable: true })
  metadataJson!: string | null;

  static toDomain(entity: EventOrmEntity): Event {
    const props: EventProps = {
      cameraId: entity.cameraId,
      contactId: entity.contactId,
      type: entity.type,
      detectedAt: entity.detectedAt,
      metadataJson: entity.metadataJson,
    };

    return Event.restore(entity.id, props);
  }

  static fromDomain(event: Event): EventOrmEntity {
    const orm = new EventOrmEntity();
    orm.id = event.id;
    orm.cameraId = event.cameraId;
    orm.contactId = event.contactId ?? null;
    orm.type = event.type;
    orm.detectedAt = event.detectedAt;
    orm.metadataJson = event.metadataJson ?? null;
    return orm;
  }
}

