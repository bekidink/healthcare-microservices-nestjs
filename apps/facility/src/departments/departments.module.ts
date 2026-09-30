import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, AuditOutboxService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
