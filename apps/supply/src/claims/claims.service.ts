import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateClaimDto } from './dto/create-claim.dto';
import type { ApproveClaimDto } from './dto/approve-claim.dto';
import type { DenyClaimDto } from './dto/deny-claim.dto';

// Mirrors Scheduling's AppointmentsService TRANSITIONS + assertTransition
// pattern exactly.
const TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'denied'],
  approved: ['paid'],
  denied: [],
  paid: [],
};

function assertTransition(current: string, next: string) {
  if (!TRANSITIONS[current]?.includes(next)) {
    throw new BadRequestException(`Cannot move a claim from "${current}" to "${next}".`);
  }
}

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateClaimDto, actorId: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: dto.policyId } });
    if (!policy) throw new NotFoundException('Insurance policy not found.');

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          policyId: dto.policyId,
          invoiceId: dto.invoiceId,
          amountClaimed: dto.amountClaimed,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: policy.patientId,
        action: 'claim.submitted',
        resourceType: 'Claim',
        resourceId: claim.id,
        metadata: { policyId: dto.policyId, invoiceId: dto.invoiceId, amountClaimed: dto.amountClaimed },
      });
      await this.auditOutbox.publishEvent(tx, 'ClaimSubmitted', {
        claimId: claim.id,
        policyId: dto.policyId,
        invoiceId: dto.invoiceId,
        amountClaimed: dto.amountClaimed,
      });

      return claim;
    });
  }

  async findById(id: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id }, include: { policy: true } });
    if (!claim) throw new NotFoundException('Claim not found.');
    return claim;
  }

  async listByPolicy(policyId: string) {
    return this.prisma.claim.findMany({ where: { policyId }, orderBy: { submittedAt: 'desc' } });
  }

  async approve(id: string, dto: ApproveClaimDto, actorId: string) {
    const claim = await this.findById(id);
    assertTransition(claim.status, 'approved');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.claim.update({
        where: { id },
        data: { status: 'approved', decidedAt: new Date(), decisionNotes: dto.decisionNotes },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: claim.policy.patientId,
        action: 'claim.approved',
        resourceType: 'Claim',
        resourceId: id,
        metadata: { decisionNotes: dto.decisionNotes },
      });
      await this.auditOutbox.publishEvent(tx, 'ClaimApproved', { claimId: id });

      return updated;
    });
  }

  async deny(id: string, dto: DenyClaimDto, actorId: string) {
    const claim = await this.findById(id);
    assertTransition(claim.status, 'denied');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.claim.update({
        where: { id },
        data: { status: 'denied', decidedAt: new Date(), decisionNotes: dto.decisionNotes },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: claim.policy.patientId,
        action: 'claim.denied',
        resourceType: 'Claim',
        resourceId: id,
        metadata: { decisionNotes: dto.decisionNotes },
      });
      await this.auditOutbox.publishEvent(tx, 'ClaimDenied', { claimId: id });

      return updated;
    });
  }

  async markPaid(id: string, actorId: string) {
    const claim = await this.findById(id);
    assertTransition(claim.status, 'paid');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.claim.update({ where: { id }, data: { status: 'paid' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: claim.policy.patientId,
        action: 'claim.paid',
        resourceType: 'Claim',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'ClaimPaid', { claimId: id });

      return updated;
    });
  }
}
