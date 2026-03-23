import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpsertBiometricProfileDto } from './dto/upsert-biometric.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.usersService.findContactsForAccount(
      req.user.sub,
      req.user.role,
      activeOnly === 'true',
    );
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id, req.user.sub, req.user.role);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, req.user.sub, req.user.role);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto, req.user.sub, req.user.role);
  }

  @Post(':id/deactivate')
  deactivate(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id, req.user.sub, req.user.role);
  }

  @Get(':id/biometric-profile')
  getBiometric(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getBiometric(id, req.user.sub, req.user.role);
  }

  @Post(':id/biometric-profile')
  upsertBiometric(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertBiometricProfileDto,
  ) {
    return this.usersService.upsertBiometric(id, dto, req.user.sub, req.user.role);
  }
}
