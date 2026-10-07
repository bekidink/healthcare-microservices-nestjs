import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Supply',
    description:
      'General (non-pharmaceutical) supply inventory, insurance policies and claims, and patient referrals. ' +
      'Every supply stock change — receipt, adjustment, waste, or consumption — creates an append-only ' +
      'SupplyLedgerEntry in the same transaction as the SupplyItem update; there is no endpoint anywhere that ' +
      'sets quantityOnHand directly. Claims reference an Invoice by id only, never a cross-db join. Owns supply_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'supply',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3011;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[supply] listening on :${port} (docs at /supply)`);
}

bootstrap();
