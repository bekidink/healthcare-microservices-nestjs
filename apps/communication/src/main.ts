import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '@healthcare/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  setupSwagger(app, {
    serviceName: 'Communication',
    description:
      'Simulated notification delivery (sms | email | push — there is no real SMS/email/push provider ' +
      'integration anywhere in this service; see NotificationsService doc comments) plus a background ' +
      "poller (ReminderPollerService) against Scheduling's GET /reminders/due and " +
      'POST /reminders/:id/mark-sent, closing the gap Scheduling has had since Milestone 3 of only ever ' +
      'recording reminder intent and never actually sending anything. Owns communication_db.',
    // See identity/src/main.ts for why this is a single flat segment, not 'docs'.
    path: 'communication',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3009;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[communication] listening on :${port} (docs at /communication)`);
}

bootstrap();
