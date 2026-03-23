import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class RoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}
