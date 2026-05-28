import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/public.decorator';

const isPublicKey = IS_PUBLIC_KEY;

function makeContext(req: {
  method?: string;
  path?: string;
  url?: string;
  headers: { authorization?: string };
}) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('permite rutas @Public', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: symbol) => key === isPublicKey),
    };
    const jwt = { verify: jest.fn() };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ headers: {} }))).toBe(true);
  });

  it('permite POST /auth/login y /auth/register sin token', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const jwt = { verify: jest.fn() };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
    expect(
      guard.canActivate(
        makeContext({ method: 'POST', path: '/auth/login', headers: {} }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        makeContext({ method: 'POST', url: '/api/auth/register', headers: {} }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        makeContext({
          method: 'POST',
          path: '',
          url: '/auth/register/',
          headers: {},
        }),
      ),
    ).toBe(true);
  });

  it('exige Bearer y verifica JWT', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const jwt = {
      verify: jest.fn().mockReturnValue({ sub: '1', email: 'a@b.com', role: 'ADMIN' }),
    };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
    const req = {
      method: 'GET',
      path: '/users',
      headers: { authorization: 'Bearer tok' },
      user: undefined as unknown,
    };
    expect(guard.canActivate(makeContext(req))).toBe(true);
    expect(req.user).toEqual({ sub: '1', email: 'a@b.com', role: 'ADMIN' });
  });

  it('lanza si falta token o es inválido', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const jwt = { verify: jest.fn().mockImplementation(() => { throw new Error('bad'); }) };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
    expect(() =>
      guard.canActivate(makeContext({ method: 'GET', path: '/x', headers: {} })),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(
        makeContext({ method: 'GET', path: '/x', headers: { authorization: 'Bearer x' } }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
