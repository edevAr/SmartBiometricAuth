import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { AccessAttemptsService } from './access-attempts.service';
import { CreateAccessAttemptDto } from './dto/create-access-attempt.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Controller()
export class AccessController {
  constructor(private readonly accessService: AccessAttemptsService) {}

  /** Registro de intento de acceso (público para simulación desde dispositivo / edge). */
  @Public()
  @Post('access/attempts')
  recordAttempt(@Body() dto: CreateAccessAttemptDto) {
    return this.accessService.recordAttempt(dto);
  }

  @Get('access-logs')
  listLogs(@Query('limit') limit?: string) {
    return this.accessService.listAccessLogs(limit ? Number(limit) : 100);
  }

  @Get('security-events')
  listSecurityEvents(@Query('limit') limit?: string) {
    return this.accessService.listSecurityEvents(limit ? Number(limit) : 100);
  }

  @Get('alerts')
  listAlerts(@Query('limit') limit?: string) {
    return this.accessService.listAlerts(limit ? Number(limit) : 100);
  }

  @Patch('alerts/:id')
  updateAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.accessService.updateAlert(id, dto.status, dto.message);
  }
}
