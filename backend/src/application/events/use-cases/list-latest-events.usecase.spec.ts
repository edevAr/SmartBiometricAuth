import { Test } from '@nestjs/testing';
import { ListLatestEventsUseCase } from './list-latest-events.usecase';
import type { EventRepositoryPort } from '@application/events/ports/event.repository';

describe('ListLatestEventsUseCase', () => {
  it('usa límite por defecto 50 y respeta límite positivo', async () => {
    const findLatestByAdmin = jest.fn().mockResolvedValue([]);
    const repo: EventRepositoryPort = {
      findLatestByAdmin,
      findById: jest.fn(),
      save: jest.fn(),
    };

    const uc = (
      await Test.createTestingModule({
        providers: [
          ListLatestEventsUseCase,
          { provide: 'EventRepositoryPort', useValue: repo },
        ],
      }).compile()
    ).get(ListLatestEventsUseCase);

    await uc.execute({ adminId: 'a' });
    expect(findLatestByAdmin).toHaveBeenCalledWith('a', 50);

    await uc.execute({ adminId: 'a', limit: 10 });
    expect(findLatestByAdmin).toHaveBeenCalledWith('a', 10);

    await uc.execute({ adminId: 'a', limit: 0 });
    expect(findLatestByAdmin).toHaveBeenCalledWith('a', 50);
  });
});
