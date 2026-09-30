import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, AuditOutboxService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
