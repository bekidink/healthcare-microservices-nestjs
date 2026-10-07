import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads the trusted x-auth-user-id header the gateway's AuthContextMiddleware
 * attaches after verifying the caller's access token. Used to populate
 * AuditEvent.actorId — NOT as an authorization gate (that's JwtVerifyGuard's
 * job on non-GET requests here — see app.module.ts).
 */
export const ActorId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-auth-user-id'] as string) || 'system';
});
