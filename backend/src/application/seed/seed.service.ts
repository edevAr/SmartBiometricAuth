import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';

const SALT_ROUNDS = 10;

/** Mismo id que usan cámaras/contactos como tenant por defecto. */
export const DEFAULT_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly roles: Repository<RoleOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
    await this.seedDefaultAdmin();
  }

  private async seedRoles() {
    const names = [
      { name: 'ADMIN', description: 'Administrador del sistema' },
      { name: 'OPERATOR', description: 'Operador de seguridad' },
      { name: 'AUTHORIZED', description: 'Usuario autorizado / residente' },
    ];
    for (const r of names) {
      const exists = await this.roles.findOne({ where: { name: r.name } });
      if (!exists) {
        await this.roles.save(this.roles.create(r));
        this.logger.log(`Rol creado: ${r.name}`);
      }
    }
  }

  private async seedDefaultAdmin() {
    const email =
      this.config.get<string>('DEFAULT_ADMIN_EMAIL') ?? 'admin@securehome.local';
    const plain =
      this.config.get<string>('DEFAULT_ADMIN_PASSWORD') ?? 'SmartBioAuth2025!';

    let admin = await this.users.findOne({ where: { email: email.toLowerCase() } });
    if (admin) {
      return;
    }

    const adminRole = await this.roles.findOne({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      this.logger.warn('No se pudo crear admin: falta rol ADMIN');
      return;
    }

    const passwordHash = await bcrypt.hash(plain, SALT_ROUNDS);
    admin = this.users.create({
      id: DEFAULT_ADMIN_USER_ID,
      email: email.toLowerCase(),
      passwordHash,
      fullName: 'Administrador',
      phone: null,
      relationship: null,
      roleId: adminRole.id,
      isActive: true,
    });
    await this.users.save(admin);
    this.logger.log(`Usuario admin sembrado: ${email}`);
  }
}
