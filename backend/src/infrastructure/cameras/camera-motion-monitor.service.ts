import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Event, EventType } from '@domain/events/event.entity';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import type { EventRepositoryPort } from '@application/events/ports/event.repository';
import { AccessAttemptsService } from '../../interfaces/http/access/access-attempts.service';
import { CameraSnapshotService } from './camera-snapshot.service';

const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

/** Muestreo de bytes distintos entre dos JPEG (0–1). */
function sampleDiffRatio(prev: Buffer, nextBuf: Buffer): number {
  if (!prev.length || !nextBuf.length) return 0;
  const len = Math.min(prev.length, nextBuf.length, 200_000);
  const targetSamples = 3500;
  const step = Math.max(1, Math.floor(len / targetSamples));
  let diff = 0;
  let n = 0;
  for (let i = 0; i < len; i += step) {
    n++;
    if (prev[i] !== nextBuf[i]) diff++;
  }
  return n > 0 ? diff / n : 0;
}

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class CameraMotionMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CameraMotionMonitorService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly lastFrame = new Map<string, Buffer>();
  private readonly lastMotionAt = new Map<string, number>();
  private readonly lastPersonAt = new Map<string, number>();
  private tickRunning = false;

  constructor(
    private readonly snapshot: CameraSnapshotService,
    private readonly accessAttempts: AccessAttemptsService,
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
    const ms = envNumber('CAMERA_MONITOR_INTERVAL_MS', 12_000);
    this.interval = setInterval(() => {
      void this.safeTick();
    }, ms);
    this.logger.log(`Monitor de cámaras activo (cada ${ms} ms)`);
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
    const motionThreshold = envNumber('CAMERA_MOTION_DIFF', 0.09);
    const personThreshold = envNumber('CAMERA_PERSON_DIFF', 0.24);
    const motionCooldownMs = envNumber('CAMERA_MOTION_COOLDOWN_MS', 45_000);
    const personCooldownMs = envNumber('CAMERA_PERSON_COOLDOWN_MS', 75_000);

    const cameras = await this.cameraRepository.findByAdmin(HARDCODED_ADMIN_ID);
    const active = cameras.filter((c) => c.isActive);

    for (const cam of active) {
      try {
        const { buffer } = await this.snapshot.fetchSnapshot(cam.id);
        const nextBuf = Buffer.from(buffer);
        const prev = this.lastFrame.get(cam.id);
        this.lastFrame.set(cam.id, nextBuf);

        if (!prev?.length) continue;

        const ratio = sampleDiffRatio(prev, nextBuf);
        const now = Date.now();

        if (ratio >= personThreshold) {
          if (now - (this.lastPersonAt.get(cam.id) ?? 0) < personCooldownMs) continue;
          this.lastPersonAt.set(cam.id, now);
          this.lastMotionAt.set(cam.id, now);
          await this.accessAttempts.recordCameraVisionDetection({
            cameraId: cam.id,
            detectionType: 'PERSON_DETECTED',
            diffRatio: ratio,
            captureBuffer: nextBuf,
          });
          await this.eventRepository.save(
            Event.createNew({
              id: randomUUID(),
              cameraId: cam.id,
              type: EventType.PERSON_DETECTED,
              metadataJson: JSON.stringify({ diffRatio: ratio, source: 'camera_monitor' }),
            }),
          );
          this.logger.log(`PERSON_DETECTED cámara ${cam.name} (${cam.ipAddress}) ratio=${ratio.toFixed(3)}`);
        } else if (ratio >= motionThreshold) {
          if (now - (this.lastMotionAt.get(cam.id) ?? 0) < motionCooldownMs) continue;
          this.lastMotionAt.set(cam.id, now);
          await this.accessAttempts.recordCameraVisionDetection({
            cameraId: cam.id,
            detectionType: 'MOTION_DETECTED',
            diffRatio: ratio,
            captureBuffer: nextBuf,
          });
          await this.eventRepository.save(
            Event.createNew({
              id: randomUUID(),
              cameraId: cam.id,
              type: EventType.MOTION_DETECTED,
              metadataJson: JSON.stringify({ diffRatio: ratio, source: 'camera_monitor' }),
            }),
          );
          this.logger.log(`MOTION_DETECTED cámara ${cam.name} (${cam.ipAddress}) ratio=${ratio.toFixed(3)}`);
        }
      } catch {
        /* Snapshot falló: cámara apagada o red; siguiente ciclo */
      }
    }
  }
}
