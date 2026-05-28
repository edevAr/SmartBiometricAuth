import { Test } from '@nestjs/testing';
import { CreateContactUseCase } from './create-contact.usecase';
import { ContactRelationship } from '@domain/contacts/contact.entity';
import type { ContactRepositoryPort } from '@application/contacts/ports/contact.repository';

describe('CreateContactUseCase', () => {
  it('crea contacto y llama save', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo: ContactRepositoryPort = {
      save,
      findById: jest.fn(),
      findByAdmin: jest.fn(),
      remove: jest.fn(),
    };

    const uc = (
      await Test.createTestingModule({
        providers: [
          CreateContactUseCase,
          { provide: 'ContactRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(CreateContactUseCase);

    const c = await uc.execute({
      adminId: 'adm',
      name: 'Ana',
      relationship: ContactRelationship.FAMILY,
      email: 'a@b.com',
    });

    expect(save).toHaveBeenCalledWith(c);
    expect(c.name).toBe('Ana');
    expect(c.adminId).toBe('adm');
  });
});
