import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccessLogOrmEntity } from '@infrastructure/persistence/typeorm/access-log.orm-entity';
import { AlertOrmEntity } from '@infrastructure/persistence/typeorm/alert.orm-entity';
import { SecurityEventOrmEntity } from '@infrastructure/persistence/typeorm/security-event.orm-entity';
import type { CreateAccessAttemptDto } from './dto/create-access-attempt.dto';

@Injectable()
export class AccessAttemptsService {
  constructor(
    @InjectRepository(AccessLogOrmEntity)
    private readonly accessLogs: Repository<AccessLogOrmEntity>,
    @InjectRepository(SecurityEventOrmEntity)
    private readonly securityEvents: Repository<SecurityEventOrmEntity>,
    @InjectRepository(AlertOrmEntity)
    private readonly alerts: Repository<AlertOrmEntity>,
  ) {}

  async recordAttempt(dto: CreateAccessAttemptDto) {
    const log = this.accessLogs.create({
      userId: dto.userId ?? null,
      cameraId: dto.cameraId ?? null,
      outcome: dto.outcome,
      method: dto.method,
      confidence:
        dto.confidence !== undefined && dto.confidence !== null
          ? String(dto.confidence)
          : null,
      metadataJson: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });
    await this.accessLogs.save(log);

    if (dto.outcome !== 'GRANTED') {
      const severity = dto.outcome === 'DENIED' ? 'HIGH' : 'MEDIUM';
      const evt = this.securityEvents.create({
        type: 'UNAUTHORIZED_ACCESS',
        severity,
        cameraId: dto.cameraId ?? null,
        userId: dto.userId ?? null,
        accessLogId: log.id,
        metadataJson: log.metadataJson,
      });
      await this.securityEvents.save(evt);

      const alert = this.alerts.create({
        securityEventId: evt.id,
        type: 'UNAUTHORIZED_ACCESS',
        status: 'OPEN',
        message: `Acceso no autorizado (${dto.outcome}) vía ${dto.method}${
          dto.confidence != null ? ` — confianza ${dto.confidence}%` : ''
        }`,
      });
      await this.alerts.save(alert);

      return {
        accessLog: this.serializeLog(log),
        securityEvent: this.serializeEvent(evt),
        alert: this.serializeAlert(alert),
      };
    }

    return { accessLog: this.serializeLog(log) };
  }

  /**
   * Alertas generadas por el monitor de cámaras (movimiento / heurística de persona).
   */
  async recordCameraVisionDetection(params: {
    cameraId: string;
    detectionType: 'MOTION_DETECTED' | 'PERSON_DETECTED';
    diffRatio: number;
    /** Fotograma JPEG capturado en el momento de la detección (opcional). */
    captureBuffer?: Buffer;
  }): Promise<void> {
    const { cameraId, detectionType, diffRatio, captureBuffer } = params;
    const severity = detectionType === 'PERSON_DETECTED' ? 'HIGH' : 'MEDIUM';
    const message =
      detectionType === 'PERSON_DETECTED'
        ? 'Posible persona: cambio visual importante en la escena de la cámara'
        : 'Movimiento detectado en la imagen de la cámara';

    const maxCaptureBytes = 512_000;
    const captureImageBase64 =
      captureBuffer && captureBuffer.length > 0 && captureBuffer.length <= maxCaptureBytes
        ? captureBuffer.toString('base64')
        : undefined;

    const evt = this.securityEvents.create({
      type: detectionType,
      severity,
      cameraId,
      userId: null,
      accessLogId: null,
      metadataJson: JSON.stringify({
        source: 'camera_frame_diff',
        diffRatio: Math.round(diffRatio * 1000) / 1000,
        ...(captureImageBase64 ? { captureImageBase64, captureMimeType: 'image/jpeg' } : {}),
      }),
    });
    await this.securityEvents.save(evt);

    const alert = this.alerts.create({
      securityEventId: evt.id,
      type: detectionType,
      status: 'OPEN',
      message,
    });
    await this.alerts.save(alert);
  }

  async listAccessLogs(limit = 100) {
    const rows = await this.accessLogs.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
    return rows.map((r) => this.serializeLog(r));
  }

  async listSecurityEvents(limit = 100) {
    const rows = await this.securityEvents.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
    return rows.map((r) => this.serializeEvent(r));
  }

  async listAlerts(limit = 100) {
    const rows = await this.alerts.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
    const secIds = rows
      .map((r) => r.securityEventId)
      .filter((id): id is string => Boolean(id));
    const bySec = new Map<string, SecurityEventOrmEntity>();
    if (secIds.length) {
      const evts = await this.securityEvents.findBy({ id: In(secIds) });
      evts.forEach((e) => bySec.set(e.id, e));
    }
    return rows.map((r) => {
      const sec = r.securityEventId ? bySec.get(r.securityEventId) : undefined;
      const meta =
        sec?.metadataJson != null && sec.metadataJson !== ''
          ? (JSON.parse(sec.metadataJson) as Record<string, unknown>)
          : null;
      const captureImageBase64 =
        typeof meta?.captureImageBase64 === 'string' ? meta.captureImageBase64 : null;
      const captureMimeType = captureImageBase64
        ? typeof meta?.captureMimeType === 'string'
          ? meta.captureMimeType
          : 'image/jpeg'
        : null;
      return {
        ...this.serializeAlert(r),
        cameraId: sec?.cameraId ?? null,
        captureImageBase64,
        captureMimeType,
      };
    });
  }

  async updateAlert(id: string, status: string, message?: string) {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    alert.status = status;
    if (message !== undefined) alert.message = message;
    await this.alerts.save(alert);
    return this.serializeAlert(alert);
  }

  private serializeLog(log: AccessLogOrmEntity) {
    return {
      id: log.id,
      userId: log.userId,
      cameraId: log.cameraId,
      outcome: log.outcome,
      method: log.method,
      confidence: log.confidence != null ? Number(log.confidence) : null,
      metadata: log.metadataJson ? JSON.parse(log.metadataJson) : null,
      createdAt: log.createdAt,
    };
  }

  private serializeEvent(evt: SecurityEventOrmEntity) {
    return {
      id: evt.id,
      type: evt.type,
      severity: evt.severity,
      cameraId: evt.cameraId,
      userId: evt.userId,
      accessLogId: evt.accessLogId,
      metadata: evt.metadataJson ? JSON.parse(evt.metadataJson) : null,
      createdAt: evt.createdAt,
    };
  }

  private serializeAlert(a: AlertOrmEntity) {
    return {
      id: a.id,
      securityEventId: a.securityEventId,
      type: a.type,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
