import { Module } from '@nestjs/common';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService, AuditOutboxService],
})
export class ClinicalNotesModule {}
