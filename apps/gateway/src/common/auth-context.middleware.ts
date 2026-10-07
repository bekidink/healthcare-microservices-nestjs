import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '@healthcare/shared';
import { IdentityClientService } from '../identity-client/identity-client.service';

/**
 * Identity + permission resolution at the edge: if a valid access token is
 * present, attach the caller's userId/sessionId/organizationId and their
 * resolved permission set (or `*` for a platform super admin) as trusted
 * internal headers, so downstream services don't have to re-verify the JWT
 * or re-resolve permissions themselves — this is the one place that
 * happens. `PermissionGuard` (packages/shared) is what actually gates a
 * route based on `x-auth-permissions`; this middleware only ever attaches
 * it, never rejects.
 *
 * Still additive, not a gate, for the identity/session headers: an
 * invalid/missing token is NOT rejected here, since not every route
 * requires auth (e.g. /auth/login itself) and each downstream service
 * remains the authority on whether a given route actually requires
 * authentication. Permission resolution, by contrast, fails closed —
 * see IdentityClientService's own doc comment.
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly identityClient: IdentityClientService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice('Bearer '.length));
        req.headers['x-auth-user-id'] = payload.sub;
        req.headers['x-auth-session-id'] = payload.sid;
        if (payload.activeOrganizationId) {
          req.headers['x-auth-organization-id'] = payload.activeOrganizationId;
        }

        const permissions = payload.isSuperAdmin
          ? ['*']
          : await this.identityClient.resolvePermissions(payload.sub, payload.activeOrganizationId);
        req.headers['x-auth-permissions'] = permissions.join(',');
      } catch {
        // Invalid/expired token: leave headers unset and let the downstream
        // service's own guard reject the request if the route requires auth.
      }
    }
    next();
  }
}
