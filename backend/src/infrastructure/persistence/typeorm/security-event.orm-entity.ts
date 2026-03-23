import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('security_events')
export class SecurityEventOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  type!: string;

  @Column({ type: 'varchar', length: 32 })
  severity!: string;

  @Column({ name: 'camera_id', type: 'uuid', nullable: true })
  cameraId!: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'access_log_id', type: 'uuid', nullable: true })
  accessLogId!: string | null;

  @Column({ name: 'metadata_json', type: 'text', nullable: true })
  metadataJson!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
