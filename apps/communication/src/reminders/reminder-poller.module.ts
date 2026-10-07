import { Module } from '@nestjs/common';
import { SchedulingClientModule } from '../scheduling-client/scheduling-client.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReminderPollerService } from './reminder-poller.service';

@Module({
  imports: [SchedulingClientModule, NotificationsModule],
  providers: [ReminderPollerService],
})
export class ReminderPollerModule {}
