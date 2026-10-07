import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Pharmacy',
    description:
      'Prescriptions (started from an in-progress Clinical encounter or as a standalone prescription), a ' +
      "facility's medication inventory, and dispensing. Every stock change — receipt, adjustment, or dispense — " +
      'creates an append-only StockLedgerEntry in the same transaction as the InventoryItem update; there is no ' +
      'endpoint anywhere that sets quantityOnHand directly. Owns pharmacy_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'pharmacy',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3007;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[pharmacy] listening on :${port} (docs at /pharmacy)`);
}

bootstrap();
