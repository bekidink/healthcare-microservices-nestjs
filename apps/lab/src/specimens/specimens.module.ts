import { Module } from '@nestjs/common';
import { SpecimensController } from './specimens.controller';
import { SpecimensService } from './specimens.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { LabOrdersModule } from '../lab-orders/lab-orders.module';

@Module({
  imports: [LabOrdersModule],
  controllers: [SpecimensController],
  providers: [SpecimensService, AuditOutboxService],
})
export class SpecimensModule {}
