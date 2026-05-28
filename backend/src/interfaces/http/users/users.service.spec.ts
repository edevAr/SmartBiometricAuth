import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactRelationship } from '@domain/contacts/contact.entity';
import { BiometricProfileOrmEntity } from '@infrastructure/persistence/typeorm/biometric-profile.orm-entity';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';
import { UsersService } from './users.service';

describe('UsersService (unit)', () => {
  let service: UsersService;
  let users: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let roles: { findOne: jest.Mock };
  let biometrics: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let qb: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  const adminUser: UserOrmEntity = {
    id: 'admin-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    phone: null,
    relationship: null,
    roleId: 'r1',
    role: { id: 'r1', name: 'ADMIN' } as RoleOrmEntity,
    ownerUserId: null,
    owner: null,
    isActive: true,
    locationLat: 1,
    locationLng: 2,
    locationAddress: 'Addr',
    passwordHash: 'h',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserOrmEntity;

  beforeEach(async () => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    users = {
      findOne: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn(async (u: UserOrmEntity) => u),
      createQueryBuilder: jest.fn(() => qb),
    };
    roles = { findOne: jest.fn() };
    biometrics = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserOrmEntity), useValue: users },
        { provide: getRepositoryToken(RoleOrmEntity), useValue: roles },
        { provide: getRepositoryToken(BiometricProfileOrmEntity), useValue: biometrics },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('toPublic expone campos esperados', () => {
    const p = service.toPublic(adminUser);
    expect(p.role).toBe('ADMIN');
    expect(p.locationLat).toBe(1);
    expect(p.locationAddress).toBe('Addr');
  });

  it('findContactsForAccount retorna [] si el rol no gestiona contactos', async () => {
    const list = await service.findContactsForAccount('x', 'AUTHORIZED');
    expect(list).toEqual([]);
    expect(users.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('findContactsForAccount filtra activos si activeOnly', async () => {
    qb.getMany.mockResolvedValue([]);
    await service.findContactsForAccount('admin-1', 'ADMIN', true);
    expect(qb.andWhere).toHaveBeenCalledWith('u.is_active = :a', { a: true });
  });

  it('findOne permite a sí mismo o contacto autorizado del admin', async () => {
    users.findOne.mockResolvedValueOnce(adminUser);
    const self = await service.findOne('admin-1', 'admin-1', 'ADMIN');
    expect(self.id).toBe('admin-1');

    const contact: UserOrmEntity = {
      ...adminUser,
      id: 'c1',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
      ownerUserId: 'admin-1',
    } as UserOrmEntity;
    users.findOne.mockResolvedValueOnce(contact);
    const out = await service.findOne('c1', 'admin-1', 'OPERATOR');
    expect(out.id).toBe('c1');

    users.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne('nope', 'admin-1', 'ADMIN')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    users.findOne.mockResolvedValueOnce({
      ...contact,
      ownerUserId: 'otro',
    });
    await expect(service.findOne('c1', 'admin-1', 'ADMIN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create prohíbe sin permiso o email duplicado o rol no ADMIN', async () => {
    await expect(
      service.create(
        {
          email: 'x@test.com',
          fullName: 'X',
          relationship: ContactRelationship.OTHER,
        },
        'a',
        'AUTHORIZED',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    users.findOne.mockResolvedValueOnce({ id: 'dup' });
    await expect(
      service.create(
        {
          email: 'dup@test.com',
          fullName: 'X',
          relationship: ContactRelationship.OTHER,
        },
        'admin-1',
        'OPERATOR',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    users.findOne.mockResolvedValueOnce(null);
    await expect(
      service.create(
        {
          email: 'x@test.com',
          fullName: 'X',
          relationship: ContactRelationship.OTHER,
          roleName: 'ADMIN',
        },
        'admin-1',
        'OPERATOR',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create inserta usuario AUTHORIZED con owner', async () => {
    const row = {
      id: 'new',
      email: 'new@test.com',
      fullName: 'N',
      phone: null,
      relationship: ContactRelationship.FRIEND,
      roleId: 'r-auth',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
      ownerUserId: 'admin-1',
      isActive: true,
      locationLat: null,
      locationLng: null,
      locationAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserOrmEntity;

    users.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    roles.findOne.mockResolvedValue({ id: 'r-auth', name: 'AUTHORIZED' });
    users.save.mockImplementation(async (u: UserOrmEntity) => {
      Object.assign(u, { id: 'new' });
      return u;
    });

    const out = await service.create(
      {
        email: 'NEW@Test.COM',
        fullName: 'N',
        password: 'secretlong',
        relationship: ContactRelationship.FRIEND,
      },
      'admin-1',
      'ADMIN',
    );

    expect(out.email).toBe('new@test.com');
    expect(users.save).toHaveBeenCalled();
  });

  it('update lanza NotFound si el usuario no es accesible', async () => {
    const otherAdmin = {
      ...adminUser,
      id: 'other-admin',
      role: { name: 'ADMIN' } as RoleOrmEntity,
    } as UserOrmEntity;
    users.findOne.mockResolvedValueOnce(otherAdmin);
    await expect(
      service.update('other-admin', { fullName: 'Hack' }, 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update: email duplicado, clearLocation y cambio de rol solo ADMIN', async () => {
    const target: UserOrmEntity = {
      ...adminUser,
      id: 'u2',
      email: 'u2@test.com',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
      ownerUserId: 'admin-1',
    } as UserOrmEntity;

    users.findOne.mockResolvedValueOnce(target);
    users.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(
      service.update('u2', { email: 'taken@test.com' }, 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(ConflictException);

    users.findOne.mockReset();
    users.findOne.mockResolvedValueOnce({ ...target });
    users.findOne.mockResolvedValueOnce({
      ...target,
      email: 'x@test.com',
      locationLat: null,
      locationLng: null,
      locationAddress: null,
    });
    await service.update('u2', { clearLocation: true }, 'admin-1', 'ADMIN');

    users.findOne.mockReset();
    users.findOne.mockResolvedValueOnce({ ...target });
    users.findOne.mockResolvedValueOnce(target);
    await expect(
      service.update('u2', { roleName: 'OPERATOR' }, 'admin-1', 'OPERATOR'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    users.findOne.mockReset();
    users.findOne.mockResolvedValueOnce({ ...adminUser, id: 'me' });
    users.findOne.mockResolvedValueOnce({ ...adminUser, id: 'me', passwordHash: 'x' });
    roles.findOne.mockResolvedValue({ id: 'r-op', name: 'OPERATOR' });
    await service.update('me', { password: 'newlongpassword', roleName: 'OPERATOR' }, 'me', 'ADMIN');
    expect(users.save).toHaveBeenCalled();
  });

  it('update permite cambiar email cuando no hay duplicado', async () => {
    const me = {
      ...adminUser,
      id: 'me',
      email: 'old@test.com',
    } as UserOrmEntity;
    users.findOne
      .mockResolvedValueOnce({ ...me })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...me, email: 'new@test.com' });
    const out = await service.update('me', { email: 'NEW@TEST.COM' }, 'me', 'ADMIN');
    expect(out.email).toBe('new@test.com');
  });

  it('update: no puede desactivarse a sí mismo si no es admin/operator', async () => {
    const self: UserOrmEntity = {
      ...adminUser,
      id: 'self',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
    } as UserOrmEntity;
    users.findOne.mockResolvedValueOnce(self);
    await expect(
      service.update('self', { isActive: false }, 'self', 'AUTHORIZED'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deactivate delega en update', async () => {
    const target: UserOrmEntity = {
      ...adminUser,
      id: 'c2',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
      ownerUserId: 'admin-1',
      isActive: true,
    } as UserOrmEntity;
    users.findOne
      .mockResolvedValueOnce({ ...target })
      .mockResolvedValueOnce({ ...target, isActive: false });
    await service.deactivate('c2', 'admin-1', 'ADMIN');
    expect(users.save).toHaveBeenCalled();
  });

  it('upsertBiometric y getBiometric', async () => {
    await expect(
      service.upsertBiometric('u1', { status: 'OK' }, 'admin-1', 'AUTHORIZED'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const contact: UserOrmEntity = {
      id: 'c3',
      role: { name: 'AUTHORIZED' } as RoleOrmEntity,
      ownerUserId: 'admin-1',
    } as UserOrmEntity;
    users.findOne.mockResolvedValue(contact);
    biometrics.findOne.mockResolvedValue(null);

    await service.upsertBiometric(
      'c3',
      { faceTemplateRef: 'f1', status: 'READY' },
      'admin-1',
      'ADMIN',
    );
    expect(biometrics.save).toHaveBeenCalled();

    users.findOne.mockResolvedValueOnce(adminUser);
    biometrics.findOne.mockResolvedValue(null);
    expect(await service.getBiometric('admin-1', 'admin-1', 'ADMIN')).toBeNull();

    users.findOne.mockResolvedValueOnce(contact);
    biometrics.findOne.mockResolvedValue({
      id: 'bp1',
      userId: 'c3',
      faceTemplateRef: 'f',
      voiceTemplateRef: null,
      status: 'OK',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const bio = await service.getBiometric('c3', 'admin-1', 'ADMIN');
    expect(bio?.status).toBe('OK');

    await expect(
      service.getBiometric('c3', 'other', 'AUTHORIZED'),
    ).rejects.toBeInstanceOf(NotFoundException);

    users.findOne.mockResolvedValueOnce({
      ...contact,
      ownerUserId: 'otro',
    });
    await expect(
      service.upsertBiometric('c3', {}, 'admin-1', 'ADMIN'),
    ).rejects.toBeInstanceOf(NotFoundException);

    users.findOne.mockResolvedValueOnce(contact);
    biometrics.findOne.mockResolvedValueOnce({
      id: 'bp2',
      userId: 'c3',
      faceTemplateRef: 'old',
      voiceTemplateRef: null,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await service.upsertBiometric(
      'c3',
      { faceTemplateRef: 'newf', voiceTemplateRef: 'v1', status: 'READY' },
      'admin-1',
      'ADMIN',
    );
    expect(biometrics.save).toHaveBeenCalled();
  });
});
