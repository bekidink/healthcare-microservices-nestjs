import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Inpatient',
    description:
      'Ward/bed/admission management (admit, discharge, bed-to-bed transfer, bed turnover) and emergency-room ' +
      'triage (arrival, triage level, admit-from-ER, ER discharge). Covers both halves of Milestone 9 in one ' +
      'service, owning inpatient_db — emergency_db is deliberately left unused, same as orders_db since ' +
      'Milestone 5.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'inpatient',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3010;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[inpatient] listening on :${port} (docs at /inpatient)`);
  // eslint-disable-next-line no-console
  console.log(`[inpatient] CLINICAL_SERVICE_URL=${process.env.CLINICAL_SERVICE_URL || 'http://localhost:3005'}`);
}

bootstrap();
