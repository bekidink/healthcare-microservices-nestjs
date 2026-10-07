import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, AuditOutboxService],
  exports: [InventoryService],
})
export class InventoryModule {}
