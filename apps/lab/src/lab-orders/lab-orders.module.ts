import { Module } from '@nestjs/common';
import { LabOrdersController } from './lab-orders.controller';
import { LabOrdersService } from './lab-orders.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [ClinicalClientModule],
  controllers: [LabOrdersController],
  providers: [LabOrdersService, AuditOutboxService],
  exports: [LabOrdersService],
})
export class LabOrdersModule {}
