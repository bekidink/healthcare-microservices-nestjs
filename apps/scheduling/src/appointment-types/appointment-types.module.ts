import { Module } from '@nestjs/common';
import { AppointmentTypesController } from './appointment-types.controller';
import { AppointmentTypesService } from './appointment-types.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [AppointmentTypesController],
  providers: [AppointmentTypesService, AuditOutboxService],
  exports: [AppointmentTypesService],
})
export class AppointmentTypesModule {}
