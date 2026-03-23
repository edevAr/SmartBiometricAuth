import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';

export type AuthenticatedRequest = Request & { user: JwtPayload };
