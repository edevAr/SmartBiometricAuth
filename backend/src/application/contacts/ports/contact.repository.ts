import { Contact } from '@domain/contacts/contact.entity';

export interface ContactRepositoryPort {
  findById(id: string): Promise<Contact | null>;
  findByAdmin(adminId: string): Promise<Contact[]>;
  save(contact: Contact): Promise<void>;
  remove(contact: Contact): Promise<void>;
}

