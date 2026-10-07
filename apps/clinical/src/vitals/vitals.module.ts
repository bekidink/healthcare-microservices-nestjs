import { Module } from '@nestjs/common';
import { VitalsController } from './vitals.controller';
import { VitalsService } from './vitals.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [VitalsController],
  providers: [VitalsService, AuditOutboxService],
})
export class VitalsModule {}
