import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Facility',
    description:
      'Organizations, facilities, departments, rooms, service catalog, provider department assignments/schedules, ' +
      'and capability-based facility configuration. Owns facility_db.',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[facility] listening on :${port} (docs at /docs)`);
}

bootstrap();
