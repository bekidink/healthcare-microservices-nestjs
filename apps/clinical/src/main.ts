import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Clinical',
    description:
      'Encounters (the clinical visit, started from a checked-in Scheduling appointment or as a walk-in), ' +
      'vital signs, SOAP/progress/discharge clinical notes (immutable once signed), per-encounter diagnoses, and ' +
      'the patient\'s standing, cross-encounter problem list. Owns clinical_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'clinical',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3005;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[clinical] listening on :${port} (docs at /clinical)`);
}

bootstrap();
