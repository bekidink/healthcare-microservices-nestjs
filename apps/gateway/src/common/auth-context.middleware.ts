import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '@healthcare/shared';

/**
 * Best-effort identity resolution at the edge: if a valid access token is
 * present, attach the caller's userId/sessionId as trusted internal headers
 * so downstream services don't have to re-parse the JWT themselves. This is
 * additive, not a gate — an invalid/missing token is NOT rejected here,
 * since not every route requires auth (e.g. /auth/login itself) and each
 * downstream service remains the authority on whether a given route
 * actually requires authentication (identity's own JwtAuthGuard, etc.).
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice('Bearer '.length));
        req.headers['x-auth-user-id'] = payload.sub;
        req.headers['x-auth-session-id'] = payload.sid;
      } catch {
        // Invalid/expired token: leave headers unset and let the downstream
        // service's own guard reject the request if the route requires auth.
      }
    }
    next();
  }
}
