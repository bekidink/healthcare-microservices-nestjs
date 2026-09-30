import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import type { AuditEventInput } from '@healthcare/shared';
import type { Prisma } from '../../generated/client';

/**
 * Writes an AuditEvent and an OutboxEvent using the SAME Prisma transaction
 * client (`tx`) the caller's domain-state change ran under — never the
 * plain PrismaService — so both land in the DB atomically with that change.
 */
@Injectable()
export class AuditOutboxService {
  async recordAudit(tx: Prisma.TransactionClient, input: AuditEventInput) {
    return tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        contextId: input.contextId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async publishEvent(tx: Prisma.TransactionClient, eventType: string, payload: unknown) {
    return tx.outboxEvent.create({
      data: {
        id: uuid(),
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });
  }
}
