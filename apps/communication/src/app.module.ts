import { Module } from '@nestjs/common';
import { KafkaModule, JwtVerifyModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ReminderPollerModule } from './reminders/reminder-poller.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, JwtVerifyModule, NotificationsModule, ReminderPollerModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
