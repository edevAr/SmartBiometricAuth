import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RegisterCameraUseCase } from '@application/cameras/use-cases/register-camera.usecase';
import { UpdateCameraUseCase } from '@application/cameras/use-cases/update-camera.usecase';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import { CameraSnapshotService } from '@infrastructure/cameras/camera-snapshot.service';
import { Public } from '../common/public.decorator';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';

// MVP: adminId fijo hasta tener auth
const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

@Public()
@Controller('cameras')
export class CamerasController {
  constructor(
    private readonly registerCameraUseCase: RegisterCameraUseCase,
    private readonly updateCameraUseCase: UpdateCameraUseCase,
    private readonly cameraSnapshotService: CameraSnapshotService,
    @Inject('CameraRepositoryPort')
    private readonly cameraRepository: CameraRepositoryPort,
  ) {}

  @Post()
  async register(@Body() dto: RegisterCameraDto) {
    const httpPort = dto.port ?? '80';
    const name = dto.name?.trim() || `Cámara ${dto.ipAddress}`;
    const rtspPath = dto.rtspPath?.trim() || '/stream1';

    const camera = await this.registerCameraUseCase.execute({
      adminId: HARDCODED_ADMIN_ID,
      name,
      ipAddress: dto.ipAddress,
      port: Number(httpPort),
      username: dto.username,
      passwordPlain: dto.password,
      rtspPath,
      location: dto.location,
    });

    return {
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ipAddress,
      port: camera.port,
      username: camera.username,
      rtspPath: camera.rtspPath,
      location: camera.location,
      isActive: camera.isActive,
      createdAt: camera.createdAt,
      updatedAt: camera.updatedAt,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    const camera = await this.updateCameraUseCase.execute(id, HARDCODED_ADMIN_ID, dto);
    return {
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ipAddress,
      port: camera.port,
      username: camera.username,
      rtspPath: camera.rtspPath,
      location: camera.location,
      isActive: camera.isActive,
      createdAt: camera.createdAt,
      updatedAt: camera.updatedAt,
    };
  }

  @Get()
  async findAll() {
    const cameras = await this.cameraRepository.findByAdmin(HARDCODED_ADMIN_ID);
    return cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ipAddress,
      port: camera.port,
      username: camera.username,
      rtspPath: camera.rtspPath,
      location: camera.location,
      isActive: camera.isActive,
      createdAt: camera.createdAt,
      updatedAt: camera.updatedAt,
    }));
  }

  @Get(':id/snapshot')
  @Header('Cache-Control', 'no-store')
  async snapshot(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, contentType } = await this.cameraSnapshotService.fetchSnapshot(id);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const camera = await this.cameraRepository.findById(id);
    if (!camera) {
      return null;
    }

    return {
      id: camera.id,
      name: camera.name,
      ipAddress: camera.ipAddress,
      port: camera.port,
      username: camera.username,
      rtspPath: camera.rtspPath,
      location: camera.location,
      isActive: camera.isActive,
      createdAt: camera.createdAt,
      updatedAt: camera.updatedAt,
    };
  }
}

