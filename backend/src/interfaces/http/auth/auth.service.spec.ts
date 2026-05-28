import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';
import { AuthService } from './auth.service';

describe('AuthService (unit)', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Pick<Repository<UserOrmEntity>, 'findOne' | 'create' | 'save'>>;
  let rolesRepo: jest.Mocked<Pick<Repository<RoleOrmEntity>, 'findOne'>>;
  let jwtSign: jest.Mock;

  const roleRow: RoleOrmEntity = {
    id: 'role-1',
    name: 'AUTHORIZED',
  } as RoleOrmEntity;

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn((u) => u as UserOrmEntity),
      save: jest.fn(async (u: UserOrmEntity) => ({
        ...u,
        id: u.id ?? 'new-id',
      })),
    };
    rolesRepo = {
      findOne: jest.fn(),
    };
    jwtSign = jest.fn().mockReturnValue('signed-jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserOrmEntity),
          useValue: usersRepo,
        },
        {
          provide: getRepositoryToken(RoleOrmEntity),
          useValue: rolesRepo,
        },
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('devuelve token cuando las credenciales son correctas', async () => {
      const hash = await bcrypt.hash('SecretPass1', 10);
      const user = {
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        fullName: 'Test',
        phone: null,
        isActive: true,
        role: { name: 'ADMIN' },
        locationLat: null,
        locationLng: null,
        locationAddress: null,
      } as UserOrmEntity;
      usersRepo.findOne.mockResolvedValue(user);

      const out = await service.login({ email: 'A@B.COM', password: 'SecretPass1' });

      expect(out.access_token).toBe('signed-jwt');
      expect(out.user.email).toBe('a@b.com');
      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', email: 'a@b.com', role: 'ADMIN' }),
      );
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'x@y.com', password: 'any' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si no hay passwordHash', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: null,
        isActive: true,
        role: { name: 'ADMIN' },
      } as UserOrmEntity);
      await expect(service.login({ email: 'a@b.com', password: 'x' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      const hash = await bcrypt.hash('right', 10);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        isActive: true,
        role: { name: 'ADMIN' },
      } as UserOrmEntity);

      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el usuario está desactivado', async () => {
      const hash = await bcrypt.hash('SecretPass1', 10);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        isActive: false,
        role: { name: 'ADMIN' },
      } as UserOrmEntity);

      await expect(service.login({ email: 'a@b.com', password: 'SecretPass1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('lanza ConflictException si el email ya existe', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'x' } as UserOrmEntity);
      await expect(
        service.register({
          email: 'dup@test.com',
          password: 'longenough',
          fullName: 'Dup',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea usuario y devuelve token cuando el rol AUTHORIZED existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      rolesRepo.findOne.mockResolvedValue(roleRow);

      const out = await service.register({
        email: 'New@Test.COM',
        password: 'longenough',
        fullName: 'Nuevo',
        phone: '+1',
      });

      expect(usersRepo.save).toHaveBeenCalled();
      expect(out.access_token).toBe('signed-jwt');
      expect(out.user.email).toBe('new@test.com');
      const saved = (usersRepo.save as jest.Mock).mock.calls[0][0] as UserOrmEntity;
      expect(saved.email).toBe('new@test.com');
      expect(saved.roleId).toBe('role-1');
      expect(await bcrypt.compare('longenough', saved.passwordHash as string)).toBe(true);
    });

    it('lanza ConflictException si no hay rol AUTHORIZED', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      rolesRepo.findOne.mockResolvedValue(null);
      await expect(
        service.register({
          email: 'a@test.com',
          password: 'longenough',
          fullName: 'X',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('devuelve el perfil cuando el usuario existe', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'p@test.com',
        fullName: 'P',
        phone: null,
        isActive: true,
        role: { name: 'OPERATOR' },
        locationLat: 1,
        locationLng: 2,
        locationAddress: 'Calle 1',
      } as UserOrmEntity);

      const p = await service.getProfile('u1');
      expect(p.email).toBe('p@test.com');
      expect(p.role).toBe('OPERATOR');
      expect(p.locationLat).toBe(1);
    });

    it('lanza UnauthorizedException si no existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('getProfile devuelve ubicación null cuando no hay coordenadas', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        fullName: 'A',
        phone: null,
        isActive: true,
        role: { name: 'ADMIN' },
        locationLat: null,
        locationLng: null,
        locationAddress: null,
      } as UserOrmEntity);
      const p = await service.getProfile('u1');
      expect(p.locationLat).toBeNull();
      expect(p.locationLng).toBeNull();
      expect(p.locationAddress).toBeNull();
    });
  });
});
