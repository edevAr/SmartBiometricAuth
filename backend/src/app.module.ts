import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedService } from './application/seed/seed.service';
import { AccessAttemptsService } from './interfaces/http/access/access-attempts.service';
import { AccessController } from './interfaces/http/access/access.controller';
import { AuthController } from './interfaces/http/auth/auth.controller';
import { AuthService } from './interfaces/http/auth/auth.service';
import { JwtAuthGuard } from './interfaces/http/auth/jwt-auth.guard';
import { CamerasController } from './interfaces/http/cameras/cameras.controller';
import { ContactsController } from './interfaces/http/contacts/contacts.controller';
import { EventsController } from './interfaces/http/events/events.controller';
import { UsersController } from './interfaces/http/users/users.controller';
import { UsersService } from './interfaces/http/users/users.service';
import { AccessLogOrmEntity } from './infrastructure/persistence/typeorm/access-log.orm-entity';
import { AlertOrmEntity } from './infrastructure/persistence/typeorm/alert.orm-entity';
import { BiometricProfileOrmEntity } from './infrastructure/persistence/typeorm/biometric-profile.orm-entity';
import { CameraOrmEntity } from './infrastructure/persistence/typeorm/camera.orm-entity';
import { ContactOrmEntity } from './infrastructure/persistence/typeorm/contact.orm-entity';
import { EventOrmEntity } from './infrastructure/persistence/typeorm/event.orm-entity';
import { RoleOrmEntity } from './infrastructure/persistence/typeorm/role.orm-entity';
import { SecurityEventOrmEntity } from './infrastructure/persistence/typeorm/security-event.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/typeorm/user.orm-entity';
import { ContactRepositoryAdapter } from './infrastructure/persistence/typeorm/contact.repository.adapter';
import { CameraMotionMonitorService } from './infrastructure/cameras/camera-motion-monitor.service';
import { CameraSnapshotService } from './infrastructure/cameras/camera-snapshot.service';
import { CameraRepositoryAdapter } from './infrastructure/persistence/typeorm/camera.repository.adapter';
import { EventRepositoryAdapter } from './infrastructure/persistence/typeorm/event.repository.adapter';
import { CreateContactUseCase } from './application/contacts/use-cases/create-contact.usecase';
import { RegisterCameraUseCase } from './application/cameras/use-cases/register-camera.usecase';
import { UpdateCameraUseCase } from './application/cameras/use-cases/update-camera.usecase';
import { ListLatestEventsUseCase } from './application/events/use-cases/list-latest-events.usecase';

const entities = [
  RoleOrmEntity,
  UserOrmEntity,
  BiometricProfileOrmEntity,
  AccessLogOrmEntity,
  SecurityEventOrmEntity,
  AlertOrmEntity,
  ContactOrmEntity,
  CameraOrmEntity,
  EventOrmEntity,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'smart_biometricauthenticator'),
        entities,
        synchronize: true, // SOLO DESARROLLO
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    AccessController,
    ContactsController,
    CamerasController,
    EventsController,
  ],
  providers: [
    AppService,
    SeedService,
    AuthService,
    UsersService,
    AccessAttemptsService,
    CreateContactUseCase,
    RegisterCameraUseCase,
    UpdateCameraUseCase,
    CameraSnapshotService,
    CameraMotionMonitorService,
    ListLatestEventsUseCase,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: 'ContactRepositoryPort',
      useClass: ContactRepositoryAdapter,
    },
    {
      provide: 'CameraRepositoryPort',
      useClass: CameraRepositoryAdapter,
    },
    {
      provide: 'EventRepositoryPort',
      useClass: EventRepositoryAdapter,
    },
  ],
})
export class AppModule {}
