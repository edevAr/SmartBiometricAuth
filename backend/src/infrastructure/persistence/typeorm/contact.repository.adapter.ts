import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '@domain/contacts/contact.entity';
import { ContactRepositoryPort } from '@application/contacts/ports/contact.repository';
import { ContactOrmEntity } from './contact.orm-entity';

@Injectable()
export class ContactRepositoryAdapter implements ContactRepositoryPort {
  constructor(
    @InjectRepository(ContactOrmEntity)
    private readonly repo: Repository<ContactOrmEntity>,
  ) {}

  async findById(id: string): Promise<Contact | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? ContactOrmEntity.toDomain(entity) : null;
  }

  async findByAdmin(adminId: string): Promise<Contact[]> {
    const entities = await this.repo.find({ where: { adminId } });
    return entities.map(ContactOrmEntity.toDomain);
  }

  async save(contact: Contact): Promise<void> {
    const entity = ContactOrmEntity.fromDomain(contact);
    await this.repo.save(entity);
  }

  async remove(contact: Contact): Promise<void> {
    await this.repo.delete({ id: contact.id });
  }
}

