import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Interop',
    description:
      'Read-only FHIR + interoperability facade: translates this system\'s internal Patient/Encounter resources ' +
      '(fetched over REST from the Patient and Clinical services — never a direct query against their databases) ' +
      'into a minimal, non-conformant subset of FHIR R4 (Patient, Encounter, Observation only) for interoperability ' +
      'demonstration purposes. This is NOT a certified or conformant FHIR server. It never writes to any other ' +
      'service — every route is a GET, and every read is logged to interoperability_db\'s InteropAccessLog.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'interop',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3012;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[interop] listening on :${port} (docs at /interop)`);
}

bootstrap();
