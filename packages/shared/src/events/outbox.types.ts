/**
 * Shape of the `outbox_event` table every service defines in its own Prisma
 * schema (see apps/identity/prisma/schema.prisma for a concrete example).
 * The state change and this row must be written in the same DB transaction;
 * a separate publisher process reads PENDING rows and delivers them to
 * Kafka, then marks them PUBLISHED — this guarantees at-least-once delivery
 * without a dual-write race between the DB commit and the Kafka publish.
 */
export type OutboxEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventRecord {
  id: string;
  eventType: string;
  payload: unknown;
  status: OutboxEventStatus;
  attempts: number;
  createdAt: Date;
  publishedAt: Date | null;
}
