import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, AuditOutboxService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
