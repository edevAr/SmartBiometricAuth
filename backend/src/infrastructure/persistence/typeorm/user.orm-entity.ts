import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleOrmEntity } from './role.orm-entity';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  phone!: string | null;

  /** Misma convención que contactos: FATHER, MOTHER, FAMILY, FRIEND, OTHER */
  @Column({ type: 'varchar', length: 32, nullable: true })
  relationship!: string | null;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => RoleOrmEntity, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: RoleOrmEntity;

  /**
   * Cuenta (usuario ADMIN/OPERATOR) que gestiona este registro.
   * Solo aplica a perfiles con rol AUTHORIZED; el propio admin tiene null.
   */
  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true })
  @JoinColumn({ name: 'owner_user_id' })
  owner!: UserOrmEntity | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
