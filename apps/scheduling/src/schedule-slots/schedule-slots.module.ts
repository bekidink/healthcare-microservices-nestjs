import { Module } from '@nestjs/common';
import { ScheduleSlotsController } from './schedule-slots.controller';
import { ScheduleSlotsService } from './schedule-slots.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { FacilityClientModule } from '../facility-client/facility-client.module';

@Module({
  imports: [FacilityClientModule],
  controllers: [ScheduleSlotsController],
  providers: [ScheduleSlotsService, AuditOutboxService],
  exports: [ScheduleSlotsService],
})
export class ScheduleSlotsModule {}
