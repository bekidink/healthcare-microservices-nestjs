import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads the trusted x-auth-user-id header the gateway's AuthContextMiddleware
 * attaches after verifying the caller's access token. Used here to populate
 * AuditEvent.actorId — NOT as an authorization gate yet. Real permission
 * enforcement (organization.manage, facility.configure, etc.) is a known gap
 * for this service, to be added consistently across services in a
 * dedicated hardening pass (roadmap step 8) rather than duplicated ad hoc
 * per-service right now.
 */
export const ActorId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-auth-user-id'] as string) || 'system';
});
