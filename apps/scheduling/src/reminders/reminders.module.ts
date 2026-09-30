import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [RemindersController],
  providers: [RemindersService, AuditOutboxService],
})
export class RemindersModule {}
