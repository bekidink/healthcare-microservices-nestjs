import { Module } from '@nestjs/common';
import { SupplyItemsController } from './supply-items.controller';
import { SupplyItemsService } from './supply-items.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [SupplyItemsController],
  providers: [SupplyItemsService, AuditOutboxService],
  exports: [SupplyItemsService],
})
export class SupplyItemsModule {}
