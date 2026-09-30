import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async list(query: { facilityId: string; departmentId?: string; date?: string }) {
    const dateFilter = query.date
      ? {
          gte: new Date(`${query.date}T00:00:00.000Z`),
          lt: new Date(new Date(`${query.date}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000),
        }
      : undefined;

    return this.prisma.queueEntry.findMany({
      where: {
        facilityId: query.facilityId,
        departmentId: query.departmentId,
        status: { in: ['waiting', 'called', 'in_service'] },
        checkedInAt: dateFilter,
      },
      orderBy: { queueNumber: 'asc' },
      include: { appointment: true },
    });
  }

  /** Marks an entry as "called" — the patient's number/name has been announced, they haven't been taken into the room yet (that's Appointment.start, which also flips this to in_service). */
  async call(id: string, actorId: string) {
    const entry = await this.prisma.queueEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Queue entry not found.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.queueEntry.update({
        where: { id },
        data: { status: 'called', calledAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: entry.facilityId,
        action: 'queue_entry.called',
        resourceType: 'QueueEntry',
        resourceId: id,
      });

      return updated;
    });
  }
}
