import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService, AuditOutboxService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
