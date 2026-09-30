import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { OrganizationsModule } from './organizations/organizations.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { DepartmentsModule } from './departments/departments.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, OrganizationsModule, FacilitiesModule, DepartmentsModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
