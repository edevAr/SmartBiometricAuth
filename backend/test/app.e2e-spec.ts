import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Pruebas funcionales / e2e contra la app real (PostgreSQL según .env).
 * Requiere base de datos accesible; validación HTTP no depende de datos semilla.
 */
describe('App (e2e / funcional)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET / responde 200', () => {
    return request(app!.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('POST /auth/login rechaza cuerpo vacío (validación)', () => {
    return request(app!.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('POST /auth/login rechaza email inválido', () => {
    return request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-es-email', password: '123456' })
      .expect(400);
  });

  it('POST /auth/login con credenciales inexistentes responde 401', () => {
    return request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email: 'noexiste-uuid@test.local', password: 'CualquierPass1' })
      .expect(401);
  });
});
