import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ContactRelationship } from '@domain/contacts/contact.entity';
import { BiometricProfileOrmEntity } from '@infrastructure/persistence/typeorm/biometric-profile.orm-entity';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UpsertBiometricProfileDto } from './dto/upsert-biometric.dto';

const SALT_ROUNDS = 10;

function canManageContacts(role: string): boolean {
  return role === 'ADMIN' || role === 'OPERATOR';
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity)
    private readonly roles: Repository<RoleOrmEntity>,
    @InjectRepository(BiometricProfileOrmEntity)
    private readonly biometrics: Repository<BiometricProfileOrmEntity>,
  ) {}

  toPublic(user: UserOrmEntity) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      relationship: user.relationship,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Contactos autorizados de la cuenta (JWT): usuarios AUTHORIZED cuyo owner es quien inició sesión.
   */
  async findContactsForAccount(
    sessionUserId: string,
    sessionRole: string,
    activeOnly = false,
  ) {
    if (!canManageContacts(sessionRole)) {
      return [];
    }

    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .where('role.name = :r', { r: 'AUTHORIZED' })
      .andWhere('u.owner_user_id = :owner', { owner: sessionUserId })
      .orderBy('u.created_at', 'DESC');

    if (activeOnly) {
      qb.andWhere('u.is_active = :a', { a: true });
    }

    const list = await qb.getMany();
    return list.map((u) => this.toPublic(u));
  }

  async findOne(id: string, sessionUserId: string, sessionRole: string) {
    const user = await this.users.findOne({ where: { id }, relations: ['role'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.id === sessionUserId) {
      return this.toPublic(user);
    }

    if (
      canManageContacts(sessionRole) &&
      user.role.name === 'AUTHORIZED' &&
      user.ownerUserId === sessionUserId
    ) {
      return this.toPublic(user);
    }

    throw new NotFoundException('Usuario no encontrado');
  }

  async create(
    dto: CreateUserDto,
    sessionUserId: string,
    sessionRole: string,
  ) {
    if (!canManageContacts(sessionRole)) {
      throw new ForbiddenException('Sin permiso para registrar contactos');
    }

    const email = dto.email.toLowerCase();
    const dup = await this.users.findOne({ where: { email } });
    if (dup) throw new ConflictException('El email ya existe');

    const roleName = dto.roleName ?? 'AUTHORIZED';
    if (roleName !== 'AUTHORIZED' && sessionRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede asignar ese rol');
    }

    const role = await this.roles.findOne({ where: { name: roleName } });
    if (!role) throw new ConflictException(`Rol inválido: ${roleName}`);

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, SALT_ROUNDS)
      : null;

    const user = this.users.create({
      email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      relationship: dto.relationship ?? ContactRelationship.OTHER,
      roleId: role.id,
      isActive: true,
      ownerUserId: roleName === 'AUTHORIZED' ? sessionUserId : null,
    });
    await this.users.save(user);
    const withRole = await this.users.findOne({ where: { id: user.id }, relations: ['role'] });
    return this.toPublic(withRole!);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    sessionUserId: string,
    sessionRole: string,
  ) {
    const user = await this.users.findOne({ where: { id }, relations: ['role'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isSelf = user.id === sessionUserId;
    const isOwnedContact =
      canManageContacts(sessionRole) &&
      user.role.name === 'AUTHORIZED' &&
      user.ownerUserId === sessionUserId;

    if (!isSelf && !isOwnedContact) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (isSelf && dto.isActive === false && !canManageContacts(sessionRole)) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta desde aquí');
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const dup = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
      if (dup) throw new ConflictException('El email ya existe');
      user.email = dto.email.toLowerCase();
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.relationship !== undefined) user.relationship = dto.relationship;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    if (dto.roleName) {
      if (sessionRole !== 'ADMIN') {
        throw new ForbiddenException('Solo el administrador puede cambiar el rol');
      }
      const role = await this.roles.findOne({ where: { name: dto.roleName } });
      if (!role) throw new ConflictException(`Rol inválido: ${dto.roleName}`);
      user.roleId = role.id;
    }
    await this.users.save(user);
    const fresh = await this.users.findOne({ where: { id }, relations: ['role'] });
    return this.toPublic(fresh!);
  }

  async deactivate(id: string, sessionUserId: string, sessionRole: string) {
    return this.update(id, { isActive: false }, sessionUserId, sessionRole);
  }

  private async assertOwnsAuthorizedContact(userId: string, sessionUserId: string) {
    const user = await this.users.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role.name !== 'AUTHORIZED' || user.ownerUserId !== sessionUserId) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async upsertBiometric(
    userId: string,
    dto: UpsertBiometricProfileDto,
    sessionUserId: string,
    sessionRole: string,
  ) {
    if (!canManageContacts(sessionRole)) {
      throw new ForbiddenException('Sin permiso');
    }
    await this.assertOwnsAuthorizedContact(userId, sessionUserId);

    let profile = await this.biometrics.findOne({ where: { userId } });
    if (!profile) {
      profile = this.biometrics.create({
        userId,
        faceTemplateRef: dto.faceTemplateRef ?? null,
        voiceTemplateRef: dto.voiceTemplateRef ?? null,
        status: dto.status ?? 'PENDING',
      });
    } else {
      if (dto.faceTemplateRef !== undefined) profile.faceTemplateRef = dto.faceTemplateRef;
      if (dto.voiceTemplateRef !== undefined) profile.voiceTemplateRef = dto.voiceTemplateRef;
      if (dto.status !== undefined) profile.status = dto.status;
    }
    await this.biometrics.save(profile);
    return {
      id: profile.id,
      userId: profile.userId,
      faceTemplateRef: profile.faceTemplateRef,
      voiceTemplateRef: profile.voiceTemplateRef,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async getBiometric(userId: string, sessionUserId: string, sessionRole: string) {
    if (userId === sessionUserId) {
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('Usuario no encontrado');
    } else if (canManageContacts(sessionRole)) {
      await this.assertOwnsAuthorizedContact(userId, sessionUserId);
    } else {
      throw new NotFoundException('Usuario no encontrado');
    }

    const profile = await this.biometrics.findOne({ where: { userId } });
    if (!profile) return null;
    return {
      id: profile.id,
      userId: profile.userId,
      faceTemplateRef: profile.faceTemplateRef,
      voiceTemplateRef: profile.voiceTemplateRef,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
