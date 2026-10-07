import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, AuditOutboxService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
