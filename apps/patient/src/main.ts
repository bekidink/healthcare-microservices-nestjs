import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Patient',
    description:
      'The Master Patient Index: patient identity, identifiers, contacts, consent, access grants, and human-reviewed ' +
      'duplicate/merge cases. Owns patient_db. Never silently merges — see /merge-cases.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'patient',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[patient] listening on :${port} (docs at /patient)`);
}

bootstrap();
