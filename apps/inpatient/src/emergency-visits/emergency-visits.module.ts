import { Module } from '@nestjs/common';
import { EmergencyVisitsController } from './emergency-visits.controller';
import { EmergencyVisitsService } from './emergency-visits.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { AdmissionsModule } from '../admissions/admissions.module';

@Module({
  imports: [AdmissionsModule],
  controllers: [EmergencyVisitsController],
  providers: [EmergencyVisitsService, AuditOutboxService],
  exports: [EmergencyVisitsService],
})
export class EmergencyVisitsModule {}
