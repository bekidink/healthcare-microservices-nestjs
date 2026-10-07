import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Analytics',
    description:
      'Computed, point-in-time analytics snapshots (e.g. inventory levels, aggregated live over REST from the ' +
      'owning domain service — never a cross-service database query) plus a small, fixed, controlled read-only ' +
      '"AI tool" facade (ai/tools/*) that proxies onto other services\' real REST APIs and logs every call as an ' +
      'AiToolInvocation. Demonstrates the milestone\'s core rule: AI uses controlled tools/domain services only ' +
      '— never direct production DB mutation. Owns analytics_db (a separate ai_db was also provisioned but is ' +
      'deliberately unused — this one service owns both halves).',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'analytics',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3013;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[analytics] listening on :${port} (docs at /analytics)`);
}

bootstrap();
