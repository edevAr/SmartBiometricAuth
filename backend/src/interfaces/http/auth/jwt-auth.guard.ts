import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../common/public.decorator';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      path?: string;
      headers: { authorization?: string };
      user?: JwtPayload;
    }>();
    /** Rutas de auth sin JWT (refuerzo si @Public() no aplica en algún despliegue). */
    const path = (request.path || request.url?.split('?')[0] || '').replace(/\/+$/, '') || '/';
    const method = (request.method ?? 'GET').toUpperCase();
    if (
      method === 'POST' &&
      (path.endsWith('/auth/login') || path.endsWith('/auth/register'))
    ) {
      return true;
    }

    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }
    const token = auth.slice(7);
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
