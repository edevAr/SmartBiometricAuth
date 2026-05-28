import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AccessAttemptsService } from './access-attempts.service';
import { AccessLogOrmEntity } from '@infrastructure/persistence/typeorm/access-log.orm-entity';
import { AlertOrmEntity } from '@infrastructure/persistence/typeorm/alert.orm-entity';
import { SecurityEventOrmEntity } from '@infrastructure/persistence/typeorm/security-event.orm-entity';

describe('AccessAttemptsService (unit)', () => {
  let service: AccessAttemptsService;
  let accessLogs: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let securityEvents: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findBy: jest.Mock;
  };
  let alerts: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    accessLogs = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x: AccessLogOrmEntity & { id?: string }) => {
        x.id = x.id ?? 'log-1';
        return x;
      }),
      find: jest.fn().mockResolvedValue([]),
    };
    securityEvents = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x: SecurityEventOrmEntity & { id?: string }) => {
        x.id = x.id ?? 'evt-1';
        return x;
      }),
      find: jest.fn().mockResolvedValue([]),
      findBy: jest.fn().mockResolvedValue([]),
    };
    alerts = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x: AlertOrmEntity & { id?: string }) => {
        x.id = x.id ?? 'al-1';
        return x;
      }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AccessAttemptsService,
        { provide: getRepositoryToken(AccessLogOrmEntity), useValue: accessLogs },
        { provide: getRepositoryToken(SecurityEventOrmEntity), useValue: securityEvents },
        { provide: getRepositoryToken(AlertOrmEntity), useValue: alerts },
      ],
    }).compile();

    service = moduleRef.get(AccessAttemptsService);
  });

  it('recordAttempt GRANTED solo persiste access log', async () => {
    const out = await service.recordAttempt({
      outcome: 'GRANTED',
      method: 'FACE',
      userId: 'u1',
    });
    expect(out.accessLog).toMatchObject({ outcome: 'GRANTED' });
    expect(out.securityEvent).toBeUndefined();
    expect(securityEvents.save).not.toHaveBeenCalled();
  });

  it('recordAttempt DENIED crea evento y alerta', async () => {
    const out = await service.recordAttempt({
      outcome: 'DENIED',
      method: 'PIN',
      cameraId: 'cam-1',
      confidence: 99,
    });
    expect(out.securityEvent).toBeDefined();
    expect(out.alert?.type).toBe('UNAUTHORIZED_ACCESS');
    expect(securityEvents.save).toHaveBeenCalled();
    expect(alerts.save).toHaveBeenCalled();
  });

  it('recordAttempt UNKNOWN usa severidad MEDIUM y mensaje sin confianza', async () => {
    const out = await service.recordAttempt({
      outcome: 'UNKNOWN',
      method: 'FACIAL',
      cameraId: 'cam-2',
      metadata: { x: 1 },
    });
    expect(out.securityEvent?.severity).toBe('MEDIUM');
    expect(out.alert?.message).not.toContain('confianza');
    expect(accessLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadataJson: expect.any(String) }),
    );
  });

  it('recordAttempt guarda confidence null cuando no viene', async () => {
    await service.recordAttempt({
      outcome: 'DENIED',
      method: 'BOTH',
    });
    expect(accessLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ confidence: null }),
    );
  });

  it('recordCameraPersonMlAlert respeta ALERT_CONTACT_EMAIL_DELAY_MS', async () => {
    const prev = process.env.ALERT_CONTACT_EMAIL_DELAY_MS;
    process.env.ALERT_CONTACT_EMAIL_DELAY_MS = '5000';
    try {
      await service.recordCameraPersonMlAlert({
        cameraId: 'c1',
        personScore: 0.5,
        modelId: 'm1',
        captureBuffer: Buffer.from('x'),
      });
    } finally {
      process.env.ALERT_CONTACT_EMAIL_DELAY_MS = prev;
    }
    expect(alerts.create).toHaveBeenCalled();
    const alertArg = alerts.create.mock.calls[0][0] as AlertOrmEntity;
    expect(alertArg.contactsNotifyAt).toBeInstanceOf(Date);
  });

  it('recordCameraPersonMlAlert ignora buffer vacío o demasiado grande', async () => {
    await service.recordCameraPersonMlAlert({
      cameraId: 'c1',
      personScore: 0.1,
      modelId: 'm',
      captureBuffer: Buffer.alloc(0),
    });
    const meta0 = JSON.parse(
      (securityEvents.create.mock.calls.at(-1)?.[0] as { metadataJson: string }).metadataJson,
    );
    expect(meta0.captureImageBase64).toBeUndefined();

    const big = Buffer.alloc(600_000, 1);
    await service.recordCameraPersonMlAlert({
      cameraId: 'c2',
      personScore: 0.2,
      modelId: 'm',
      captureBuffer: big,
    });
    const meta1 = JSON.parse(
      (securityEvents.create.mock.calls.at(-1)?.[0] as { metadataJson: string }).metadataJson,
    );
    expect(meta1.captureImageBase64).toBeUndefined();
  });

  it('ALERT_CONTACT_EMAIL_DELAY_MS inválido usa default 120000', async () => {
    const prev = process.env.ALERT_CONTACT_EMAIL_DELAY_MS;
    process.env.ALERT_CONTACT_EMAIL_DELAY_MS = 'not-a-number';
    const before = Date.now();
    try {
      await service.recordCameraPersonMlAlert({
        cameraId: 'c-delay',
        personScore: 0.3,
        modelId: 'm',
      });
    } finally {
      process.env.ALERT_CONTACT_EMAIL_DELAY_MS = prev;
    }
    const alertArg = alerts.create.mock.calls.at(-1)?.[0] as AlertOrmEntity;
    const delta = alertArg.contactsNotifyAt!.getTime() - before;
    expect(delta).toBeGreaterThan(100_000);
  });

  it('listAccessLogs respeta tope 500', async () => {
    await service.listAccessLogs(9999);
    expect(accessLogs.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 }),
    );
  });

  it('listSecurityEvents serializa metadata', async () => {
    securityEvents.find.mockResolvedValue([
      {
        id: 'se1',
        type: 'T',
        severity: 'LOW',
        cameraId: null,
        userId: null,
        accessLogId: null,
        metadataJson: '{"k":1}',
        createdAt: new Date(),
      },
    ]);
    const rows = await service.listSecurityEvents(3);
    expect(rows[0].metadata).toEqual({ k: 1 });
  });

  it('listSecurityEvents metadata null si json vacío', async () => {
    securityEvents.find.mockResolvedValue([
      {
        id: 'se2',
        type: 'T',
        severity: 'LOW',
        cameraId: null,
        userId: null,
        accessLogId: null,
        metadataJson: '',
        createdAt: new Date(),
      },
    ]);
    const rows = await service.listSecurityEvents(2);
    expect(rows[0].metadata).toBeNull();
  });

  it('listAccessLogs sin metadataJson', async () => {
    accessLogs.find.mockResolvedValue([
      {
        id: 'l1',
        userId: null,
        cameraId: null,
        outcome: 'GRANTED',
        method: 'PIN',
        confidence: null,
        metadataJson: null,
        createdAt: new Date(),
      },
    ]);
    const rows = await service.listAccessLogs(5);
    expect(rows[0].metadata).toBeNull();
    expect(rows[0].confidence).toBeNull();
  });

  it('listAlerts usa image/jpeg por defecto si hay base64 sin mime', async () => {
    alerts.find.mockResolvedValue([
      {
        id: 'a1',
        securityEventId: 'e1',
        type: 'PERSON_DETECTED',
        status: 'OPEN',
        message: 'm',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactsNotifyAt: null,
        contactsNotifiedAt: null,
      },
    ]);
    securityEvents.findBy.mockResolvedValue([
      {
        id: 'e1',
        cameraId: 'cam',
        metadataJson: JSON.stringify({ captureImageBase64: 'QQQ' }),
      },
    ]);
    const rows = await service.listAlerts(5);
    expect(rows[0].captureMimeType).toBe('image/jpeg');
  });

  it('listAlerts adjunta capture desde metadata', async () => {
    alerts.find.mockResolvedValue([
      {
        id: 'a1',
        securityEventId: 'e1',
        type: 'PERSON_DETECTED',
        status: 'OPEN',
        message: 'm',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactsNotifyAt: null,
        contactsNotifiedAt: null,
      },
    ]);
    securityEvents.findBy.mockResolvedValue([
      {
        id: 'e1',
        cameraId: 'cam-z',
        metadataJson: JSON.stringify({
          captureImageBase64: 'AAA',
          captureMimeType: 'image/jpeg',
        }),
      },
    ]);

    const rows = await service.listAlerts(10);
    expect(securityEvents.findBy).toHaveBeenCalled();
    const callArg = securityEvents.findBy.mock.calls[0][0];
    expect(callArg).toEqual(expect.objectContaining({ id: expect.anything() }));
    expect(rows[0].captureImageBase64).toBe('AAA');
    expect(rows[0].cameraId).toBe('cam-z');
  });

  it('listAlerts sin securityEventId no llama findBy', async () => {
    alerts.find.mockResolvedValue([
      {
        id: 'a2',
        securityEventId: null,
        type: 'X',
        status: 'OPEN',
        message: 'm',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactsNotifyAt: null,
        contactsNotifiedAt: null,
      },
    ]);
    await service.listAlerts(5);
    expect(securityEvents.findBy).not.toHaveBeenCalled();
  });

  it('updateAlert lanza si no existe', async () => {
    alerts.findOne.mockResolvedValue(null);
    await expect(service.updateAlert('x', 'CLOSED')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateAlert persiste cambios', async () => {
    const row = {
      id: 'a1',
      status: 'OPEN',
      message: 'old',
      securityEventId: null,
      type: 'T',
      createdAt: new Date(),
      updatedAt: new Date(),
      contactsNotifyAt: null,
      contactsNotifiedAt: null,
    };
    alerts.findOne.mockResolvedValue(row);
    const out = await service.updateAlert('a1', 'RESOLVED', 'ok');
    expect(row.status).toBe('RESOLVED');
    expect(row.message).toBe('ok');
    expect(out.status).toBe('RESOLVED');
  });
});
