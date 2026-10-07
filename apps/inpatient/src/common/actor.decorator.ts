import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Reads the trusted x-auth-user-id header the gateway's AuthContextMiddleware
 * attaches after verifying the caller's access token. Used to populate
 * AuditEvent.actorId — NOT as an authorization gate yet (same documented
 * gap as identity/facility/patient/scheduling/clinical/lab/pharmacy; see
 * their common/actor.decorator.ts). Inpatient additionally applies
 * JwtVerifyGuard at the controller level for mutating requests — see
 * app.module.ts.
 */
export const ActorId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-auth-user-id'] as string) || 'system';
});
