import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateReferralDto } from './dto/create-referral.dto';

// Mirrors Scheduling's AppointmentsService TRANSITIONS + assertTransition
// pattern exactly.
const TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'declined'],
  accepted: ['completed'],
  completed: [],
  declined: [],
};

function assertTransition(current: string, next: string) {
  if (!TRANSITIONS[current]?.includes(next)) {
    throw new BadRequestException(`Cannot move a referral from "${current}" to "${next}".`);
  }
}

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateReferralDto, actorId: string) {
    if (!dto.toFacilityId && !dto.toProviderId) {
      throw new BadRequestException('At least one of toFacilityId or toProviderId is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const referral = await tx.referral.create({
        data: {
          patientId: dto.patientId,
          fromProviderId: dto.fromProviderId,
          toFacilityId: dto.toFacilityId,
          toProviderId: dto.toProviderId,
          reason: dto.reason,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.patientId,
        action: 'referral.pending',
        resourceType: 'Referral',
        resourceId: referral.id,
        metadata: { fromProviderId: dto.fromProviderId, toFacilityId: dto.toFacilityId, toProviderId: dto.toProviderId },
      });
      await this.auditOutbox.publishEvent(tx, 'ReferralCreated', {
        referralId: referral.id,
        patientId: dto.patientId,
      });

      return referral;
    });
  }

  async findById(id: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found.');
    return referral;
  }

  async listByPatient(patientId: string) {
    return this.prisma.referral.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
  }

  async accept(id: string, actorId: string) {
    const referral = await this.findById(id);
    assertTransition(referral.status, 'accepted');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: 'accepted', decidedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: referral.patientId,
        action: 'referral.accepted',
        resourceType: 'Referral',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'ReferralAccepted', { referralId: id });

      return updated;
    });
  }

  async decline(id: string, actorId: string) {
    const referral = await this.findById(id);
    assertTransition(referral.status, 'declined');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id },
        data: { status: 'declined', decidedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: referral.patientId,
        action: 'referral.declined',
        resourceType: 'Referral',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'ReferralDeclined', { referralId: id });

      return updated;
    });
  }

  async complete(id: string, actorId: string) {
    const referral = await this.findById(id);
    assertTransition(referral.status, 'completed');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({ where: { id }, data: { status: 'completed' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: referral.patientId,
        action: 'referral.completed',
        resourceType: 'Referral',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'ReferralCompleted', { referralId: id });

      return updated;
    });
  }
}
