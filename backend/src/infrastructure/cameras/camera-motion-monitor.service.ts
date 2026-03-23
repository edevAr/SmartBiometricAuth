import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Event, EventType } from '@domain/events/event.entity';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import type { EventRepositoryPort } from '@application/events/ports/event.repository';
import { AccessAttemptsService } from '../../interfaces/http/access/access-attempts.service';
import { CameraSnapshotService } from './camera-snapshot.service';
import { PersonDetectionService } from './person-detection.service';

const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Monitor de cámaras: en cada intervalo toma un snapshot y ejecuta detección ML (COCO SSD).
 * Solo genera alertas / eventos PERSON_DETECTED cuando el modelo clasifica una **persona**
 * por encima del umbral de confianza. Movimiento, animales o insectos no disparan alertas.
 */
@Injectable()
export class CameraMotionMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CameraMotionMonitorService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly lastPersonAt = new Map<string, number>();
  private tickRunning = false;

  constructor(
    private readonly snapshot: CameraSnapshotService,
    private readonly accessAttempts: AccessAttemptsService,
    private readonly personDetection: PersonDetectionService,
    @Inject('CameraRepositoryPort')
    private readonly cameraRepository: CameraRepositoryPort,
    @Inject('EventRepositoryPort')
    private readonly eventRepository: EventRepositoryPort,
  ) {}

  onModuleInit(): void {
    if (process.env.CAMERA_MONITOR_ENABLED === '0') {
      this.logger.log('Monitor de cámaras desactivado (CAMERA_MONITOR_ENABLED=0)');
      return;
    }
    const ms = envNumber('CAMERA_MONITOR_INTERVAL_MS', 4_000);
    this.interval = setInterval(() => {
      void this.safeTick();
    }, ms);
    this.logger.log(
      `Monitor de cámaras activo (cada ${ms} ms). Alertas solo si COCO-SSD detecta clase «person».`,
    );
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async safeTick(): Promise<void> {
    if (this.tickRunning) return;
    this.tickRunning = true;
    try {
      await this.tick();
    } catch (e) {
      this.logger.warn(`Tick monitor: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.tickRunning = false;
    }
  }

  private async tick(): Promise<void> {
    if (process.env.CAMERA_PERSON_ML_ENABLED === '0') {
      return;
    }

    const minScore = envNumber('CAMERA_PERSON_MIN_SCORE', 0.32);
    const maxInputSide = envNumber('CAMERA_PERSON_MAX_INPUT_SIDE', 800);
    const personCooldownMs = envNumber('CAMERA_PERSON_COOLDOWN_MS', 75_000);

    const cameras = await this.cameraRepository.findByAdmin(HARDCODED_ADMIN_ID);
    const active = cameras.filter((c) => c.isActive);

    for (const cam of active) {
      try {
        const { buffer } = await this.snapshot.fetchSnapshot(cam.id);
        const nextBuf = Buffer.from(buffer);

        const { isPerson, bestScore, rawPersonScores } = await this.personDetection.detectPerson(
          nextBuf,
          minScore,
          maxInputSide,
        );

        if (!isPerson) {
          if (
            process.env.CAMERA_PERSON_DEBUG === '1' &&
            rawPersonScores.length > 0
          ) {
            const top = Math.max(...rawPersonScores);
            this.logger.log(
              `[CAMERA_PERSON_DEBUG] ${cam.name}: persona detectada por modelo pero bajo umbral (max=${top.toFixed(3)}, umbral=${minScore})`,
            );
          }
          continue;
        }

        const now = Date.now();
        if (now - (this.lastPersonAt.get(cam.id) ?? 0) < personCooldownMs) {
          continue;
        }
        this.lastPersonAt.set(cam.id, now);

        const modelId = this.personDetection.getLoadedModelId();
        await this.accessAttempts.recordCameraPersonMlAlert({
          cameraId: cam.id,
          personScore: bestScore,
          modelId,
          captureBuffer: nextBuf,
        });
        await this.eventRepository.save(
          Event.createNew({
            id: randomUUID(),
            cameraId: cam.id,
            type: EventType.PERSON_DETECTED,
            metadataJson: JSON.stringify({
              source: 'coco_ssd_person',
              modelId,
              personScore: Math.round(bestScore * 1000) / 1000,
            }),
          }),
        );
        this.logger.log(
          `PERSON_DETECTED (ML) cámara ${cam.name} (${cam.ipAddress}) score=${bestScore.toFixed(3)}`,
        );
      } catch {
        /* Snapshot falló: cámara apagada o red; siguiente ciclo */
      }
    }
  }
}
