import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface DueReminder {
  id: string;
  appointmentId: string;
  channel: string;
  scheduledFor: string;
}

/**
 * The only place Communication talks to Scheduling — a plain synchronous
 * REST call (per the core microservice rule: "REST for synchronous
 * operations"), never a query against scheduling_db directly.
 *
 * Scheduling's Reminder model has, since Milestone 3, only ever recorded
 * reminder INTENT — it does not send SMS/push/email itself (see
 * apps/scheduling/src/reminders/reminders.service.ts's own doc comment).
 * It exposes GET /reminders/due and POST /reminders/:id/mark-sent
 * specifically anticipating a future Notification service to poll them —
 * that's this service's ReminderPollerService.
 *
 * Both methods are best-effort: a Scheduling outage must not crash
 * Communication's poller, so failures are logged and swallowed (never
 * thrown) here.
 */
@Injectable()
export class SchedulingClientService {
  private readonly logger = new Logger(SchedulingClientService.name);
  private readonly baseUrl = process.env.SCHEDULING_SERVICE_URL || 'http://localhost:3004';

  constructor(private readonly http: HttpService) {}

  async listDueReminders(): Promise<DueReminder[]> {
    try {
      const response = await firstValueFrom(this.http.get(`${this.baseUrl}/reminders/due`));
      return response.data ?? [];
    } catch (error) {
      this.logger.warn(`Could not fetch due reminders from Scheduling service: ${error}`);
      return [];
    }
  }

  async markReminderSent(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/reminders/${id}/mark-sent`, {}));
    } catch (error) {
      // Swallowed deliberately: one failed mark-sent call must not crash the
      // poller loop. Worst case, the reminder shows up as "due" again on the
      // next poll cycle — handled by ReminderPollerService's dedup check
      // against existing NotificationMessage rows.
      this.logger.warn(`Could not mark reminder ${id} as sent on Scheduling service: ${error}`);
    }
  }
}
