import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingClientService } from '../scheduling-client/scheduling-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateNotificationDto } from '../notifications/dto/create-notification.dto';

const POLL_INTERVAL_MS = 15000;

/**
 * Background poller that closes the gap Scheduling's Reminder model has had
 * since Milestone 3: Scheduling only ever records reminder INTENT (see
 * apps/scheduling/src/reminders/reminders.service.ts's own doc comment) —
 * it never sends anything itself. This polls Scheduling's
 * GET /reminders/due, "delivers" (simulated — see NotificationsService's
 * doc comment; there is no real SMS/email/push provider integration
 * anywhere in this codebase) a NotificationMessage for each due reminder,
 * and calls back POST /reminders/:id/mark-sent.
 *
 * Shaped exactly like OutboxPublisherService: OnModuleInit starts a
 * setInterval guarded by a `running` boolean so overlapping polls can't
 * stack, OnModuleDestroy clears the timer, and each reminder is processed
 * in its own try/catch so one bad reminder can't kill the whole poll cycle.
 */
@Injectable()
export class ReminderPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderPollerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingClient: SchedulingClientService,
    private readonly notificationsService: NotificationsService
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async pollOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const dueReminders = await this.schedulingClient.listDueReminders();

      for (const reminder of dueReminders) {
        try {
          // Dedup defense against double-sending: a reminder only flips to
          // Scheduling's status "sent" once our POST /reminders/:id/mark-sent
          // round-trip completes, so the SAME due reminder can come back on
          // the NEXT 15s poll before that round-trip lands (slow network,
          // this process restarting mid-cycle, etc.). Rather than rely on a
          // DB-level unique constraint — which schema.prisma documents
          // Prisma can't cleanly express across these nullable columns — we
          // defensively check for an existing NotificationMessage sourced
          // from this reminder first and skip it if one is already there.
          // This is a best-effort guard, not a transactional one: a tight
          // enough race between two overlapping poll cycles could still
          // double-send, but at a 15s interval against a per-reminder
          // mark-sent call, that's an acceptable, explicitly documented gap
          // rather than one hidden behind a false sense of safety.
          const existing = await this.prisma.notificationMessage.findFirst({
            where: { sourceType: 'Reminder', sourceId: reminder.id },
          });
          if (existing) {
            this.logger.debug(`Skipping reminder ${reminder.id} — already has a NotificationMessage.`);
            continue;
          }

          // Scheduling's Reminder model has no real patient contact address
          // (phone number / email inbox) on it — only an appointmentId. Real
          // recipient-contact-info resolution (e.g. looking up the patient's
          // phone/email via the Patient service) is a follow-up, NOT
          // implemented here: appointmentId is used as a stand-in
          // recipientId purely to demonstrate the delivery PIPELINE end to
          // end, not an actually-addressable recipient.
          const dto: CreateNotificationDto = {
            channel: reminder.channel as CreateNotificationDto['channel'],
            recipientId: reminder.appointmentId,
            templateCode: 'appointment_reminder',
            payload: { scheduledFor: reminder.scheduledFor },
          };

          await this.notificationsService.create(dto, 'system', {
            sourceType: 'Reminder',
            sourceId: reminder.id,
          });

          await this.schedulingClient.markReminderSent(reminder.id);
        } catch (error) {
          this.logger.warn(`Failed to process due reminder ${reminder.id}: ${error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Reminder poll failed: ${error}`);
    } finally {
      this.running = false;
    }
  }
}
