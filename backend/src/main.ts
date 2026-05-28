import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86_400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  /** 0.0.0.0 = accesible desde otras máquinas en la red (LAN). Use HOST=127.0.0.1 solo local. */
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  logger.log(`API escuchando en http://${host}:${port}`);
  if (host === '0.0.0.0') {
    logger.log(
      `Desde otra máquina en la red: http://<IP-de-este-equipo>:${port} (CORS ya permite orígenes LAN)`,
    );
  }
}
bootstrap();
