import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import type { Express } from 'express';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { registerProxyRoutes } from './proxy/proxy.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // `CORS_ORIGINS` is an optional comma-separated allowlist. Unset, or
  // explicitly "*" (the literal value render.yaml sets today), both mean
  // "allow any origin" — handled via `origin: true`, which reflects
  // whatever Origin header the request sent. That's deliberate, not just
  // the unset fallback: the `cors` middleware's own wildcard handling only
  // triggers for the literal string `'*'` passed directly as `origin`, not
  // for an array containing it — `"*".split(',')` produces `['*']`, an
  // exact-match allowlist containing the 4-character origin "*", which no
  // real browser Origin header ever equals. That mismatch is exactly why
  // this previously allowed no origin at all, including with
  // CORS_ORIGINS=* set verbatim on the deployed instance.
  const corsOriginsEnv = process.env.CORS_ORIGINS?.trim();
  const corsOrigins =
    corsOriginsEnv && corsOriginsEnv !== '*'
      ? corsOriginsEnv
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : undefined;
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });
  // setGlobalPrefix + URI versioning together put every Nest-registered
  // controller at /api/v1/... — matching the proxy routes below exactly, so
  // the whole gateway has one consistent public path scheme rather than
  // Nest controllers living at /v1/... and proxied routes at /api/v1/....
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalFilters(new HttpExceptionFilter());

  // Docs for the gateway's own routes only (health, and whatever it grows
  // later) — each downstream service publishes its own /docs directly;
  // this is not an aggregator across all of them.
  setupSwagger(app, {
    serviceName: 'Gateway',
    description: 'Routing, auth-context resolution, rate limiting, request IDs, versioning, CORS and error normalization in front of the platform services.',
  });

  // KNOWN ISSUE (found and reproduced, not yet fixed — see conversation/PR
  // notes): AuthContextMiddleware is registered via AppModule.configure()
  // or `forRoutes('*')`, but these raw proxy routes are added directly to
  // the underlying Express instance from here, after NestFactory.create().
  // Empirically, requests matching a proxy route never reach
  // AuthContextMiddleware at all — meaning x-auth-user-id/
  // x-auth-organization-id/x-auth-permissions are never attached to any
  // proxied (i.e. every downstream) request, so every
  // PermissionGuard-protected route (organization.manage, user.manage,
  // patient.merge, encounter.sign, invoice.void) rejects real, permitted
  // callers as if they had no permissions at all. A fix attempted during
  // this session (moving the proxy into AppModule's own middleware chain,
  // as a function passed to `consumer.apply(...)`) hit a second, deeper
  // issue: Nest's own global-prefix/versioning route resolution mutates
  // `req.url` down to `/` by the time an unmatched request reaches
  // `forRoutes('*')` middleware, and restoring it from `req.originalUrl`
  // before invoking http-proxy-middleware caused requests to hang rather
  // than complete. Reverted rather than ship a half-fixed, regression-prone
  // change under time pressure. The more promising path, not yet attempted:
  // construct the Express app directly (`express()`), mount
  // RequestId/AuthContext/proxy middleware on it as plain Express (no Nest
  // involvement, so no mangling), and pass that app into
  // `NestFactory.create(AppModule, new ExpressAdapter(app))` so Nest only
  // ever owns its own routes (currently just /api/health).
  registerProxyRoutes(app.getHttpAdapter().getInstance() as Express);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[gateway] listening on :${port}`);
}

bootstrap();
