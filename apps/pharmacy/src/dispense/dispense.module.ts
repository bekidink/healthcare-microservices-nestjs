import { Module } from '@nestjs/common';
import { DispenseController } from './dispense.controller';
import { DispenseService } from './dispense.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';

@Module({
  imports: [InventoryModule, PrescriptionsModule],
  controllers: [DispenseController],
  providers: [DispenseService, AuditOutboxService],
})
export class DispenseModule {}
