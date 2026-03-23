import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Contact, ContactRelationship } from '@domain/contacts/contact.entity';
import type { ContactRepositoryPort } from '@application/contacts/ports/contact.repository';

export interface CreateContactCommand {
  adminId: string;
  name: string;
  relationship: ContactRelationship;
  email?: string | null;
  phone?: string | null;
}

@Injectable()
export class CreateContactUseCase {
  constructor(
    @Inject('ContactRepositoryPort')
    private readonly contactRepository: ContactRepositoryPort,
  ) {}

  async execute(command: CreateContactCommand): Promise<Contact> {
    const contact = Contact.createNew({
      id: randomUUID(),
      adminId: command.adminId,
      name: command.name,
      relationship: command.relationship,
      email: command.email,
      phone: command.phone,
    });

    await this.contactRepository.save(contact);

    return contact;
  }
}

