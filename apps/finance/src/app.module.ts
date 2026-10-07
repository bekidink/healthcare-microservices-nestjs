import { Module } from '@nestjs/common';
import { KafkaModule, JwtVerifyModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, JwtVerifyModule, InvoicesModule, PaymentsModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
