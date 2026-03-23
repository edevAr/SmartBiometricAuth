import { Event } from '@domain/events/event.entity';

export interface EventRepositoryPort {
  findById(id: string): Promise<Event | null>;
  findLatestByAdmin(adminId: string, limit: number): Promise<Event[]>;
  save(event: Event): Promise<void>;
}

