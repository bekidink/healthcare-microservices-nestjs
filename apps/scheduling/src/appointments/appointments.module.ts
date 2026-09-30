import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AuditOutboxService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
