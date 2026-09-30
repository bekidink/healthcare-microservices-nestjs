import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads the trusted x-auth-user-id header the gateway's AuthContextMiddleware
 * attaches after verifying the caller's access token. Used to populate
 * AuditEvent.actorId and MergeCase.decidedBy — NOT as an authorization gate
 * yet (see identity/facility for the same documented gap).
 */
export const ActorId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-auth-user-id'] as string) || 'system';
});
