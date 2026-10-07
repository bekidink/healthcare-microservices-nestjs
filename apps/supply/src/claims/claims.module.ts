import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, AuditOutboxService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
