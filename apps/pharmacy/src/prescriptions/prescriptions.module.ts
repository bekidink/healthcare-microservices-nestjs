import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [ClinicalClientModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, AuditOutboxService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
