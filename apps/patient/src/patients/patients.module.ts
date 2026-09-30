import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientMatchingService } from './patient-matching.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { MergeCasesModule } from '../merge-cases/merge-cases.module';

@Module({
  imports: [MergeCasesModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientMatchingService, AuditOutboxService],
  exports: [PatientsService],
})
export class PatientsModule {}
