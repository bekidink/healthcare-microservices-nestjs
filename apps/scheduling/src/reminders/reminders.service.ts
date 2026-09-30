import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateReminderDto } from './dto/create-reminder.dto';

/**
 * Scheduling only records reminder INTENT here — it does not send SMS/push/
 * email itself (there's no Notification/Communication service yet). A
 * future service is expected to poll GET /reminders/due and call
 * POST /reminders/:id/mark-sent once it has actually delivered one.
 */
@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateReminderDto, actorId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    return this.prisma.$transaction(async (tx) => {
      const reminder = await tx.reminder.create({
        data: {
          appointmentId: dto.appointmentId,
          channel: dto.channel,
          scheduledFor: new Date(dto.scheduledFor),
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'reminder.scheduled',
        resourceType: 'Reminder',
        resourceId: reminder.id,
      });

      return reminder;
    });
  }

  async listDue(before?: string) {
    return this.prisma.reminder.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: before ? new Date(before) : new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async markSent(id: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Reminder not found.');

    return this.prisma.reminder.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }
}
