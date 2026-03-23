import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';
import type { JwtPayload } from './jwt-auth.guard';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roles: Repository<RoleOrmEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const role = await this.roles.findOne({ where: { name: 'AUTHORIZED' } });
    if (!role) {
      throw new ConflictException('Rol AUTHORIZED no disponible (ejecute el seed).');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      relationship: null,
      roleId: role.id,
      isActive: true,
    });
    await this.users.save(user);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: UserOrmEntity) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        isActive: user.isActive,
      },
    };
  }
}
