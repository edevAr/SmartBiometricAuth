import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contact, ContactRelationship, ContactProps } from '@domain/contacts/contact.entity';

@Entity('trusted_contacts')
export class ContactOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  relationship!: ContactRelationship;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static toDomain(entity: ContactOrmEntity): Contact {
    const props: ContactProps = {
      adminId: entity.adminId,
      name: entity.name,
      relationship: entity.relationship,
      email: entity.email,
      phone: entity.phone,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Contact.restore(entity.id, props);
  }

  static fromDomain(contact: Contact): ContactOrmEntity {
    const orm = new ContactOrmEntity();
    orm.id = contact.id;
    orm.adminId = contact.adminId;
    orm.name = contact.name;
    orm.relationship = contact.relationship;
    orm.email = contact.email ?? null;
    orm.phone = contact.phone ?? null;
    orm.isActive = contact.isActive;
    orm.createdAt = contact.createdAt;
    orm.updatedAt = contact.updatedAt;
    return orm;
  }
}

