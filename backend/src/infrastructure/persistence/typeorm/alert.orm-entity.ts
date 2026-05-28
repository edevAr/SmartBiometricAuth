import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alerts')
export class AlertOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'security_event_id', type: 'uuid', nullable: true })
  securityEventId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  type!: string;

  @Column({ type: 'varchar', length: 32, default: 'OPEN' })
  status!: string;

  @Column({ type: 'text' })
  message!: string;

  /**
   * Tras detectar persona: si la alerta sigue OPEN al llegar esta hora, se envía correo a contactos.
   */
  @Column({ name: 'contacts_notify_at', type: 'timestamptz', nullable: true })
  contactsNotifyAt!: Date | null;

  /** Cuándo se envió (o se intentó el flujo de) correo a contactos; evita reenvíos. */
  @Column({ name: 'contacts_notified_at', type: 'timestamptz', nullable: true })
  contactsNotifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
