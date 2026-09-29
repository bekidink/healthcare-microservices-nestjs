/**
 * Every privileged action (approvals, refunds, disclosures, state
 * transitions on clinical/financial records) must write one of these,
 * synchronously, in the same transaction as the state change it records —
 * never as a best-effort side effect. See PRD Sec. 21 (Security, Privacy &
 * Consent) and the Core Microservice Rules doc.
 */
export interface AuditEventInput {
  actorId: string;
  actorRoles?: string[];
  contextId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  /** Set when this action was performed under a break-glass emergency-access policy. */
  breakGlassReason?: string;
}
