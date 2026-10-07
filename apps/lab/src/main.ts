import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Lab',
    description:
      'Lab orders (started from an in-progress Clinical encounter or as a standalone order), specimen ' +
      'collection/receipt/rejection, and lab results — corrected via an append-only amendment chain ' +
      '(correctsResultId), never an in-place overwrite. Owns lab_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'lab',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3006;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[lab] listening on :${port} (docs at /lab)`);
}

bootstrap();
