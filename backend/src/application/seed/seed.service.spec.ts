import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoleOrmEntity } from '@infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '@infrastructure/persistence/typeorm/user.orm-entity';
import { SeedService, DEFAULT_ADMIN_USER_ID } from './seed.service';

describe('SeedService', () => {
  it('crea roles faltantes y admin si no existe', async () => {
    const rolesData: RoleOrmEntity[] = [];
    const usersData: UserOrmEntity[] = [];

    const rolesRepo = {
      findOne: jest.fn(({ where }: { where: { name: string } }) =>
        Promise.resolve(rolesData.find((r) => r.name === where.name) ?? null),
      ),
      create: jest.fn(
        (r: Partial<RoleOrmEntity>) =>
          ({ id: `role-id-${r.name}`, ...r }) as RoleOrmEntity,
      ),
      save: jest.fn(async (r: RoleOrmEntity) => {
        rolesData.push(r);
        return r;
      }),
    };

    const usersRepo = {
      findOne: jest.fn(({ where }: { where: { email?: string } }) => {
        if (where.email) {
          return Promise.resolve(usersData.find((u) => u.email === where.email) ?? null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((u: Partial<UserOrmEntity>) => u as UserOrmEntity),
      save: jest.fn(async (u: UserOrmEntity) => {
        usersData.push(u);
        return u;
      }),
    };

    const config = {
      get: jest.fn((k: string) => {
        if (k === 'DEFAULT_ADMIN_EMAIL') return 'seed@test.local';
        if (k === 'DEFAULT_ADMIN_PASSWORD') return 'Passw0rd!Seed';
        return undefined;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: ConfigService, useValue: config },
        { provide: getRepositoryToken(RoleOrmEntity), useValue: rolesRepo },
        { provide: getRepositoryToken(UserOrmEntity), useValue: usersRepo },
      ],
    }).compile();

    const seed = moduleRef.get(SeedService);
    await seed.onModuleInit();

    expect(rolesData.map((r) => r.name).sort()).toEqual(['ADMIN', 'AUTHORIZED', 'OPERATOR']);
    expect(usersData).toHaveLength(1);
    expect(usersData[0].id).toBe(DEFAULT_ADMIN_USER_ID);
    expect(usersData[0].email).toBe('seed@test.local');

    await seed.onModuleInit();
    expect(usersData).toHaveLength(1);
  });

  it('no crea admin si falta rol ADMIN', async () => {
    const rolesRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((r: unknown) => r),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const usersRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    const config = { get: jest.fn().mockReturnValue('a@a.com') };

    const seed = (
      await Test.createTestingModule({
        providers: [
          SeedService,
          { provide: ConfigService, useValue: config },
          { provide: getRepositoryToken(RoleOrmEntity), useValue: rolesRepo },
          { provide: getRepositoryToken(UserOrmEntity), useValue: usersRepo },
        ],
      }).compile()
    ).get(SeedService);

    await seed.onModuleInit();
    expect(usersRepo.save).not.toHaveBeenCalled();
  });
});
