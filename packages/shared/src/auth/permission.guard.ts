import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

/**
 * Marks a route as requiring one or more permission codes (e.g.
 * `@RequirePermissions('invoice.void')`). Combine with `PermissionGuard`.
 * Requiring more than one code means the caller needs ALL of them, not any.
 */
export const RequirePermissions = (...codes: string[]) => SetMetadata(REQUIRED_PERMISSIONS_KEY, codes);

/**
 * Checks the `x-auth-permissions` header the gateway's AuthContextMiddleware
 * attaches after resolving the caller's permissions (or `*` for a platform
 * super admin — see identity's UsersService.resolvePermissions). This is
 * NOT a re-verification of the bearer token itself (that's JwtVerifyGuard's
 * job, a separate, composable guard) — it trusts the gateway as the one
 * place permission resolution happens, the same trust boundary
 * `x-auth-user-id` already relies on throughout this codebase.
 *
 * Fails closed: a route with `@RequirePermissions(...)` but a missing or
 * empty `x-auth-permissions` header (gateway never ran, or the caller has
 * no matching permissions) is rejected — there is no "no header means
 * unrestricted" fallback.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(REQUIRED_PERMISSIONS_KEY, context.getHandler());
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['x-auth-permissions'];
    const granted = new Set(
      (header ?? '')
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean)
    );

    if (granted.has('*')) return true;

    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required permission(s): ${missing.join(', ')}`);
    }
    return true;
  }
}
