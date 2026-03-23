import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('access_logs')
export class AccessLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'camera_id', type: 'uuid', nullable: true })
  cameraId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  outcome!: string;

  @Column({ type: 'varchar', length: 32 })
  method!: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  confidence!: string | null;

  @Column({ name: 'metadata_json', type: 'text', nullable: true })
  metadataJson!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
