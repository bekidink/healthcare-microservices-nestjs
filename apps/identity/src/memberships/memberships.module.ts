import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService, AuditOutboxService],
})
export class MembershipsModule {}
