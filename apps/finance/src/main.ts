import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Finance',
    description:
      'Invoices (started from an in-progress Clinical encounter or as a standalone invoice) with their line ' +
      'items, manual payments, and the payment-gateway callback webhook — verified (invoice must exist and ' +
      'not already be paid/void) and idempotent (redelivery of the same externalReference never double-' +
      'processes a payment). Owns finance_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'finance',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3008;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[finance] listening on :${port} (docs at /finance)`);
}

bootstrap();
