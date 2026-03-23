import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Camera, CameraProps } from '@domain/cameras/camera.entity';

@Entity('cameras')
export class CameraOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64 })
  ipAddress!: string;

  @Column({ type: 'int' })
  port!: number;

  @Column({ type: 'varchar', length: 255 })
  username!: string;

  @Column({ name: 'password_encrypted', type: 'varchar', length: 512 })
  passwordEncrypted!: string;

  @Column({ name: 'rtsp_path', type: 'varchar', length: 512 })
  rtspPath!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static toDomain(entity: CameraOrmEntity): Camera {
    const props: CameraProps = {
      adminId: entity.adminId,
      name: entity.name,
      ipAddress: entity.ipAddress,
      port: entity.port,
      username: entity.username,
      passwordEncrypted: entity.passwordEncrypted,
      rtspPath: entity.rtspPath,
      location: entity.location,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Camera.restore(entity.id, props);
  }

  static fromDomain(camera: Camera): CameraOrmEntity {
    const orm = new CameraOrmEntity();
    orm.id = camera.id;
    orm.adminId = camera.adminId;
    orm.name = camera.name;
    orm.ipAddress = camera.ipAddress;
    orm.port = camera.port;
    orm.username = camera.username;
    orm.passwordEncrypted = camera.passwordEncrypted;
    orm.rtspPath = camera.rtspPath;
    orm.location = camera.location ?? null;
    orm.isActive = camera.isActive;
    orm.createdAt = camera.createdAt;
    orm.updatedAt = camera.updatedAt;
    return orm;
  }
}

