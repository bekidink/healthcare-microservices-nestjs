import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [ClinicalClientModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, AuditOutboxService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
