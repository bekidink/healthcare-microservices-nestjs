import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { InventoryModule } from './inventory/inventory.module';
import { DispenseModule } from './dispense/dispense.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, PrescriptionsModule, InventoryModule, DispenseModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
