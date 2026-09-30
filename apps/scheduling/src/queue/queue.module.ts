import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [QueueController],
  providers: [QueueService, AuditOutboxService],
})
export class QueueModule {}
