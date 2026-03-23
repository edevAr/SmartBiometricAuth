import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

@Entity('biometric_profiles')
export class BiometricProfileOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ name: 'face_template_ref', type: 'varchar', length: 512, nullable: true })
  faceTemplateRef!: string | null;

  @Column({ name: 'voice_template_ref', type: 'varchar', length: 512, nullable: true })
  voiceTemplateRef!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
