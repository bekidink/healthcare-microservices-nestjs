import { Module } from '@nestjs/common';
import { WardsController } from './wards.controller';
import { WardsService } from './wards.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [WardsController],
  providers: [WardsService, AuditOutboxService],
  exports: [WardsService],
})
export class WardsModule {}
