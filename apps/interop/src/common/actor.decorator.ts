import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads the trusted x-auth-user-id header the gateway's AuthContextMiddleware
 * attaches after verifying the caller's access token. Used to populate
 * InteropAccessLog.requestedBy — NOT as an authorization gate (same
 * documented gap as identity/facility/patient/scheduling/clinical/lab; see
 * their common/actor.decorator.ts). Every route here is a read (GET), so no
 * JwtVerifyGuard is wired up for this service — it would be a no-op.
 */
export const ActorId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-auth-user-id'] as string) || 'system';
});
