import { Module } from '@nestjs/common';
import { ProblemListController } from './problem-list.controller';
import { ProblemListService } from './problem-list.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [ProblemListController],
  providers: [ProblemListService, AuditOutboxService],
})
export class ProblemListModule {}
