import { Module } from '@nestjs/common';
import { KafkaModule, JwtVerifyModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { WardsModule } from './wards/wards.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { EmergencyVisitsModule } from './emergency-visits/emergency-visits.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, JwtVerifyModule, WardsModule, AdmissionsModule, EmergencyVisitsModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
