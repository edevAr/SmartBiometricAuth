import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import type { CameraRepositoryPort } from '@application/cameras/ports/camera.repository';
import { AlertOrmEntity } from '@infrastructure/persistence/typeorm/alert.orm-entity';
import { SecurityEventOrmEntity } from '@infrastructure/persistence/typeorm/security-event.orm-entity';
import { PersonAlertMailService } from '@infrastructure/mail/person-alert-mail.service';

const HARDCODED_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Si una alerta PERSON_DETECTED sigue OPEN cuando llega `contactsNotifyAt`, envía correo a contactos
 * y marca `contactsNotifiedAt`. Si el admin cambia el estado antes, no se envía.
 */
@Injectable()
export class AlertContactEscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertContactEscalationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickRunning = false;

  constructor(
    @InjectRepository(AlertOrmEntity)
    private readonly alerts: Repository<AlertOrmEntity>,
    @InjectRepository(SecurityEventOrmEntity)
    private readonly securityEvents: Repository<SecurityEventOrmEntity>,
    private readonly personAlertMail: PersonAlertMailService,
    @Inject('CameraRepositoryPort')
    private readonly cameras: CameraRepositoryPort,
  ) {}

  onModuleInit(): void {
    if (process.env.ALERT_CONTACT_ESCALATION_ENABLED === '0') {
      this.logger.log('Escalación correo contactos desactivada (ALERT_CONTACT_ESCALATION_ENABLED=0)');
      return;
    }
    const ms = envNumber('ALERT_ESCALATION_TICK_MS', 10_000);
    this.timer = setInterval(() => void this.safeTick(), ms);
    this.logger.log(`Escalación correo contactos: tick cada ${ms} ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async safeTick(): Promise<void> {
    if (this.tickRunning) return;
    this.tickRunning = true;
    try {
      await this.tick();
    } catch (e) {
      this.logger.warn(`Tick escalación: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.tickRunning = false;
    }
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const pending = await this.alerts.find({
      where: {
        type: 'PERSON_DETECTED',
        status: 'OPEN',
        contactsNotifiedAt: IsNull(),
        contactsNotifyAt: And(Not(IsNull()), LessThanOrEqual(now)),
      },
      take: 20,
      order: { createdAt: 'ASC' },
    });

    for (const alert of pending) {
      await this.processAlert(alert);
    }
  }

  private async processAlert(alert: AlertOrmEntity): Promise<void> {
    if (!alert.securityEventId) {
      alert.contactsNotifiedAt = new Date();
      await this.alerts.save(alert);
      return;
    }

    const fresh = await this.alerts.findOne({ where: { id: alert.id } });
    if (!fresh || fresh.status !== 'OPEN' || fresh.contactsNotifiedAt != null) {
      return;
    }

    const evt = await this.securityEvents.findOne({ where: { id: alert.securityEventId } });
    if (!evt?.cameraId) {
      this.logger.warn(`Escalación: alerta ${alert.id} sin cámara en evento`);
      fresh.contactsNotifiedAt = new Date();
      await this.alerts.save(fresh);
      return;
    }

    let meta: Record<string, unknown> = {};
    try {
      meta = evt.metadataJson ? (JSON.parse(evt.metadataJson) as Record<string, unknown>) : {};
    } catch {
      meta = {};
    }

    const personScore = typeof meta.personScore === 'number' ? meta.personScore : 0.4;
    const modelId = typeof meta.modelId === 'string' ? meta.modelId : 'coco-ssd';
    let captureBuffer: Buffer | undefined;
    if (typeof meta.captureImageBase64 === 'string') {
      try {
        captureBuffer = Buffer.from(meta.captureImageBase64, 'base64');
      } catch {
        captureBuffer = undefined;
      }
    }

    const cam = await this.cameras.findById(evt.cameraId);
    const cameraDisplayName = cam ? `${cam.name} (${cam.ipAddress})` : evt.cameraId;

    const sent = await this.personAlertMail.sendPersonDetectedAlert({
      ownerAdminId: HARDCODED_ADMIN_ID,
      cameraId: evt.cameraId,
      cameraDisplayName,
      personScore,
      modelId,
      captureBuffer,
    });

    fresh.contactsNotifiedAt = new Date();
    await this.alerts.save(fresh);

    if (sent) {
      this.logger.log(`Escalación: correo enviado para alerta ${fresh.id}`);
    } else {
      this.logger.warn(
        `Escalación: alerta ${fresh.id} cerrada para reintentos (sin envío: revise MAIL_*, contactos con email o MAIL_PERSON_ALERT_ENABLED).`,
      );
    }
  }
}
