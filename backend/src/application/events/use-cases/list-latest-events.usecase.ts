import { Inject, Injectable } from '@nestjs/common';
import { Event } from '@domain/events/event.entity';
import type { EventRepositoryPort } from '@application/events/ports/event.repository';

export interface ListLatestEventsQuery {
  adminId: string;
  limit?: number;
}

@Injectable()
export class ListLatestEventsUseCase {
  constructor(
    @Inject('EventRepositoryPort')
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  async execute(query: ListLatestEventsQuery): Promise<Event[]> {
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    return this.eventRepository.findLatestByAdmin(query.adminId, limit);
  }
}

