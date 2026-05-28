import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccessAttemptsService } from '@interfaces/http/access/access-attempts.service';
import { AccessLogOrmEntity } from '@infrastructure/persistence/typeorm/access-log.orm-entity';
import { AlertOrmEntity } from '@infrastructure/persistence/typeorm/alert.orm-entity';
import { SecurityEventOrmEntity } from '@infrastructure/persistence/typeorm/security-event.orm-entity';

/**
 * Integración real con PostgreSQL (mismas entidades que producción).
 * Requiere DB accesible (variables DB_* o shell con `source` / export).
 * En CI: servicio Postgres con las mismas variables que la app.
 */
describe('AccessAttemptsService (integration, Postgres)', () => {
  let moduleRef: TestingModule | undefined;
  let service: AccessAttemptsService;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'smart_biometricauthenticator',
          entities: [AccessLogOrmEntity, SecurityEventOrmEntity, AlertOrmEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          AccessLogOrmEntity,
          SecurityEventOrmEntity,
          AlertOrmEntity,
        ]),
      ],
      providers: [AccessAttemptsService],
    }).compile();

    service = moduleRef.get(AccessAttemptsService);
    dataSource = moduleRef.get(DataSource);
  }, 60_000);

  afterAll(async () => {
    try {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
      await moduleRef?.close();
    } catch {
      /* noop */
    }
  });

  it('registra intento denegado y persiste security_event + alerta', async () => {
    const cameraId = '770e8400-e29b-41d4-a716-446655440099';
    const out = await service.recordAttempt({
      userId: null,
      cameraId,
      outcome: 'DENIED',
      method: 'FACE',
      confidence: 42,
    });

    expect(out.securityEvent).toBeDefined();
    expect(out.alert?.type).toBe('UNAUTHORIZED_ACCESS');

    const dbAlert = await dataSource.getRepository(AlertOrmEntity).findOne({
      where: { id: out.alert!.id },
    });
    expect(dbAlert?.securityEventId).toBe(out.securityEvent!.id);

    const evt = await dataSource.getRepository(SecurityEventOrmEntity).findOne({
      where: { id: out.securityEvent!.id },
    });
    expect(evt?.type).toBe('UNAUTHORIZED_ACCESS');
    expect(evt?.cameraId).toBe(cameraId);
  });

  it('crea alerta PERSON_DETECTED con contactsNotifyAt según ALERT_CONTACT_EMAIL_DELAY_MS', async () => {
    const prev = process.env.ALERT_CONTACT_EMAIL_DELAY_MS;
    process.env.ALERT_CONTACT_EMAIL_DELAY_MS = '3000';
    const cameraId = '880e8400-e29b-41d4-a716-446655440088';
    const before = Date.now();
    try {
      await service.recordCameraPersonMlAlert({
        cameraId,
        personScore: 0.88,
        modelId: 'test-model',
      });
    } finally {
      process.env.ALERT_CONTACT_EMAIL_DELAY_MS = prev;
    }

    const evts = await dataSource.getRepository(SecurityEventOrmEntity).find({
      where: { cameraId, type: 'PERSON_DETECTED' },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const evt = evts[0];
    expect(evt).toBeDefined();

    const row = await dataSource.getRepository(AlertOrmEntity).findOne({
      where: { securityEventId: evt!.id, type: 'PERSON_DETECTED' },
    });
    expect(row).toBeDefined();
    expect(row!.contactsNotifiedAt).toBeNull();
    expect(row!.contactsNotifyAt).toBeInstanceOf(Date);
    const delta = row!.contactsNotifyAt!.getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(3000 - 2000);
    expect(delta).toBeLessThan(10_000);

    const meta = JSON.parse(evt!.metadataJson ?? '{}') as { personScore?: number; modelId?: string };
    expect(meta.personScore).toBeCloseTo(0.88, 2);
    expect(meta.modelId).toBe('test-model');
  });
});
