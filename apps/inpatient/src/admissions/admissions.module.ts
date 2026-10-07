import { Module } from '@nestjs/common';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [ClinicalClientModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService, AuditOutboxService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
