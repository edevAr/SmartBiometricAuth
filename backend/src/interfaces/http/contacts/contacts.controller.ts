import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { CreateContactUseCase } from '@application/contacts/use-cases/create-contact.usecase';
import { ContactRelationship } from '@domain/contacts/contact.entity';
import type { ContactRepositoryPort } from '@application/contacts/ports/contact.repository';
import { Public } from '../common/public.decorator';
import { CreateContactDto } from './dto/create-contact.dto';

// MVP: adminId fijo hasta tener auth
const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

@Public()
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createContactUseCase: CreateContactUseCase,
    @Inject('ContactRepositoryPort')
    private readonly contactRepository: ContactRepositoryPort,
  ) {}

  @Post()
  async create(@Body() dto: CreateContactDto) {
    const contact = await this.createContactUseCase.execute({
      adminId: HARDCODED_ADMIN_ID,
      name: dto.name,
      relationship: dto.relationship ?? ContactRelationship.OTHER,
      email: dto.email,
      phone: dto.phone,
    });

    return {
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      email: contact.email,
      phone: contact.phone,
      isActive: contact.isActive,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }

  @Get()
  async findAll() {
    const contacts = await this.contactRepository.findByAdmin(HARDCODED_ADMIN_ID);
    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      email: contact.email,
      phone: contact.phone,
      isActive: contact.isActive,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const contact = await this.contactRepository.findById(id);
    if (!contact) {
      return null;
    }

    return {
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      email: contact.email,
      phone: contact.phone,
      isActive: contact.isActive,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}

