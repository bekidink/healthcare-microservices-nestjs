import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { AppointmentTypesModule } from './appointment-types/appointment-types.module';
import { ScheduleSlotsModule } from './schedule-slots/schedule-slots.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { QueueModule } from './queue/queue.module';
import { RemindersModule } from './reminders/reminders.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    PrismaModule,
    KafkaModule,
    AppointmentTypesModule,
    ScheduleSlotsModule,
    AppointmentsModule,
    QueueModule,
    RemindersModule,
  ],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
