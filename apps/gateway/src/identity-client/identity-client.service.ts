import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * The gateway's one call into identity's internal (never publicly routed)
 * permission-resolution endpoint — see apps/identity/src/users/
 * users.controller.ts's InternalController. Called once per request by
 * AuthContextMiddleware, never cached: a cached permission set would go
 * stale the moment a role/membership changes, which is exactly what the
 * AccessTokenPayload doc comment already warns against baking into the
 * token itself.
 */
@Injectable()
export class IdentityClientService {
  private readonly logger = new Logger(IdentityClientService.name);
  private readonly baseUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async resolvePermissions(userId: string, organizationId?: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/internal/permissions`, {
          params: organizationId ? { userId, organizationId } : { userId },
        })
      );
      return response.data?.permissions ?? [];
    } catch (error) {
      // Fail closed: if identity is unreachable, the caller gets NO
      // permissions attached rather than silently falling back to an
      // unrestricted request. PermissionGuard rejects on an empty/missing
      // header, which is the correct direction to fail for an authorization
      // check (unlike a best-effort data lookup, where failing open/returning
      // [] is acceptable — see every other *-client.service.ts in this repo).
      this.logger.warn(`Could not resolve permissions for user ${userId}: ${error}`);
      return [];
    }
  }
}
