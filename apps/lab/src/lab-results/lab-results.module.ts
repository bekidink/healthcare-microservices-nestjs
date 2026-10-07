import { Module } from '@nestjs/common';
import { LabResultsController } from './lab-results.controller';
import { LabResultsService } from './lab-results.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { LabOrdersModule } from '../lab-orders/lab-orders.module';

@Module({
  imports: [LabOrdersModule],
  controllers: [LabResultsController],
  providers: [LabResultsService, AuditOutboxService],
})
export class LabResultsModule {}
