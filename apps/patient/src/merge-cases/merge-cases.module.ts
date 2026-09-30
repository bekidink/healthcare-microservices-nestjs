import { Module } from '@nestjs/common';
import { MergeCasesController } from './merge-cases.controller';
import { MergeCasesService } from './merge-cases.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [MergeCasesController],
  providers: [MergeCasesService, AuditOutboxService],
  exports: [MergeCasesService],
})
export class MergeCasesModule {}
