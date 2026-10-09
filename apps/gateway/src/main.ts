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

  // `CORS_ORIGINS` is an optional comma-separated allowlist. When unset,
  // `origin: true` reflects whatever Origin header the request sent — unlike
  // the literal string '*', this is compatible with `credentials: true`
  // (the combination the `cors` middleware actually needs to see the header
  // at all). Passing an array containing just '*' — the previous behavior —
  // is not a wildcard to that middleware; it's an exact-match allowlist
  // containing the literal 4-character origin "*", which real browser
  // Origin headers never match, so no origin was ever actually allowed.
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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

  // Downstream services are proxied at the raw Express layer — the gateway
  // deliberately doesn't re-declare every downstream route as a Nest
  // controller, since that would duplicate each service's own route table
  // and drift out of sync with it over time.
  registerProxyRoutes(app.getHttpAdapter().getInstance() as Express);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[gateway] listening on :${port}`);
}

bootstrap();
