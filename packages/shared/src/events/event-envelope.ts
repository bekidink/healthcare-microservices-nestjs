/**
 * Standard envelope every domain event is wrapped in before being written to
 * a service's outbox table and published to Kafka. Consumers must be
 * idempotent per eventId (at-least-once delivery) and must tolerate unknown
 * additional payload fields (forward compatibility) rather than rejecting
 * unrecognized ones.
 */
export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  /** Organization/facility context the event occurred under, if any. */
  contextId?: string;
  occurredAt: string;
  version: number;
  payload: TPayload;
  correlationId?: string;
}

export function createEventEnvelope<TPayload>(params: {
  eventId: string;
  eventType: string;
  payload: TPayload;
  contextId?: string;
  correlationId?: string;
  version?: number;
}): EventEnvelope<TPayload> {
  return {
    eventId: params.eventId,
    eventType: params.eventType,
    contextId: params.contextId,
    occurredAt: new Date().toISOString(),
    version: params.version ?? 1,
    payload: params.payload,
    correlationId: params.correlationId,
  };
}
