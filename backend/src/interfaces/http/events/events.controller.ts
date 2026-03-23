import { Controller, Get, Query } from '@nestjs/common';
import { ListLatestEventsUseCase } from '@application/events/use-cases/list-latest-events.usecase';
import { Public } from '../common/public.decorator';

// MVP: adminId fijo hasta tener auth
const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

@Public()
@Controller('events')
export class EventsController {
  constructor(
    private readonly listLatestEventsUseCase: ListLatestEventsUseCase,
  ) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const events = await this.listLatestEventsUseCase.execute({
      adminId: HARDCODED_ADMIN_ID,
      limit: limit ? Number(limit) : undefined,
    });

    return events.map((event) => ({
      id: event.id,
      cameraId: event.cameraId,
      contactId: event.contactId,
      type: event.type,
      detectedAt: event.detectedAt,
      metadataJson: event.metadataJson,
    }));
  }
}

