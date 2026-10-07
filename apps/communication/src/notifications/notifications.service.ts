import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { Prisma } from '../../generated/client';
import type { CreateNotificationDto } from './dto/create-notification.dto';

/** Traces a NotificationMessage back to whatever triggered it (e.g. a Scheduling Reminder). */
export interface NotificationSource {
  sourceType: string;
  sourceId: string;
}

/**
 * This is the first real notification *delivery* anywhere in this
 * ecosystem — but "delivery" here is entirely SIMULATED. There is no real
 * SMS/email/push provider integration in this codebase: no Twilio/SES/FCM
 * client, no provider credentials, no outbound network call to a carrier or
 * mail server, nothing. `create` logs what it would have sent via Nest's
 * Logger and immediately marks the row "sent" in the same call. This
 * demonstrates the end-to-end pipeline (create -> "send" -> audit ->
 * outbox) that a real provider integration would plug into later; it does
 * not reach an actual phone or inbox. Say this plainly wherever this class
 * is read, not just here.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  /**
   * Creates the NotificationMessage row and "sends" it (simulated, see class
   * doc) in the same call — there is no separate pending state in practice,
   * since nothing here can actually fail to reach a real provider.
   *
   * `source` is set only by internal callers (currently ReminderPollerService)
   * to trace this notification back to what triggered it; the public
   * POST /notifications endpoint never sets it.
   */
  async create(dto: CreateNotificationDto, actorId: string, source?: NotificationSource) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.notificationMessage.create({
        data: {
          channel: dto.channel,
          recipientId: dto.recipientId,
          templateCode: dto.templateCode,
          payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
          sourceType: source?.sourceType,
          sourceId: source?.sourceId,
        },
      });

      // Simulated delivery only — see class doc comment. No real SMS/email/
      // push provider is integrated anywhere in this codebase.
      this.logger.log(`[simulated ${created.channel}] to ${created.recipientId}: ${created.templateCode}`);

      const sent = await tx.notificationMessage.update({
        where: { id: created.id },
        data: { status: 'sent', sentAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'notification.sent',
        resourceType: 'NotificationMessage',
        resourceId: sent.id,
        metadata: {
          channel: sent.channel,
          templateCode: sent.templateCode,
          sourceType: sent.sourceType,
          sourceId: sent.sourceId,
        },
      });
      await this.auditOutbox.publishEvent(tx, 'NotificationSent', {
        notificationId: sent.id,
        channel: sent.channel,
        recipientId: sent.recipientId,
        templateCode: sent.templateCode,
        sourceType: sent.sourceType,
        sourceId: sent.sourceId,
      });

      return sent;
    });
  }

  async findById(id: string) {
    const notification = await this.prisma.notificationMessage.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found.');
    return notification;
  }

  async listByRecipient(recipientId: string) {
    return this.prisma.notificationMessage.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
