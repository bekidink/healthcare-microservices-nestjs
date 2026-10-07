import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { SpecimensModule } from './specimens/specimens.module';
import { LabResultsModule } from './lab-results/lab-results.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, LabOrdersModule, SpecimensModule, LabResultsModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
