import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from './jwt-payload';

/**
 * Stateless bearer-token verification (signature + expiry only, via the
 * shared JWT_ACCESS_SECRET) for services that have no local session table to
 * cross-check against (that full revocation check is identity_db's own
 * JwtAuthGuard's job — see apps/identity/src/auth/jwt-auth.guard.ts).
 *
 * Only gates mutating requests (POST/PATCH/PUT/DELETE) — GET stays open, the
 * same permissiveness every read endpoint in this codebase already has.
 * This is a deliberately partial, additive step against the long-documented
 * "no service downstream of the gateway requires a valid token" gap: new
 * services (finance, communication, inpatient, supply, interop, analytics)
 * opt into it; retrofitting it onto identity/facility/patient/scheduling/
 * clinical/lab/pharmacy is a named follow-up, not done here, since that
 * would be a mechanical sweep across 7 already-working services without the
 * build/integration verification that change would deserve.
 */
@Injectable()
export class JwtVerifyGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'GET') return true;

    const header: string | undefined = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token.');

    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.authUser = { userId: payload.sub, sessionId: payload.sid };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
