import { Module } from '@nestjs/common';
import { DiagnosesController } from './diagnoses.controller';
import { DiagnosesService } from './diagnoses.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [DiagnosesController],
  providers: [DiagnosesService, AuditOutboxService],
})
export class DiagnosesModule {}
