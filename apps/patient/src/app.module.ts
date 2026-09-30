import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { PatientsModule } from './patients/patients.module';
import { MergeCasesModule } from './merge-cases/merge-cases.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, PatientsModule, MergeCasesModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
