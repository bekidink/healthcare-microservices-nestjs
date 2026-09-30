import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Scheduling',
    description:
      'Appointment types, bookable schedule slots (expanded from Facility\'s recurring ProviderSchedule), the ' +
      'Appointment state machine (REQUESTED -> CONFIRMED -> CHECKED_IN -> IN_SERVICE -> COMPLETED / NO_SHOW / ' +
      'CANCELLED), the day-of QueueEntry view, and reminder scheduling. Owns scheduling_db.',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3004;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[scheduling] listening on :${port} (docs at /docs)`);
}

bootstrap();
