import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { PatientMatchingService } from './patient-matching.service';
import { MergeCasesService } from '../merge-cases/merge-cases.service';
import type { Prisma } from '../../generated/client';
import type { CreatePatientDto } from './dto/create-patient.dto';
import type { AddIdentifierDto } from './dto/add-identifier.dto';
import type { AddContactDto } from './dto/add-contact.dto';
import type { RecordConsentDto } from './dto/record-consent.dto';
import type { CreateAccessGrantDto } from './dto/create-access-grant.dto';

// A candidate scoring at or above this, found during registration, is
// significant enough to auto-open a MergeCase for human review (PRD Sec 6:
// "Duplicate detection before registration" / Sec 28: "flag and route to
// MPI review; do not silently merge"). Weaker signals are still surfaced in
// the creation response as `possibleDuplicates` but don't open a case on
// their own, to avoid case-spam on thin evidence.
const AUTO_FLAG_THRESHOLD = 80;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly matching: PatientMatchingService,
    private readonly mergeCases: MergeCasesService
  ) {}

  async create(dto: CreatePatientDto, actorId: string) {
    const dateOfBirth = new Date(dto.dateOfBirth);

    const candidates = await this.matching.findCandidates({
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth,
      nationalId: dto.nationalId,
      phone: dto.phone,
    });

    const { patient, openedMergeCaseIds } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth,
          gender: dto.gender,
        },
      });

      if (dto.nationalId) {
        await tx.patientIdentifier.create({
          data: { patientId: created.id, type: 'national_id', value: dto.nationalId, isPrimary: true },
        });
      }
      if (dto.phone) {
        await tx.patientContact.create({
          data: { patientId: created.id, type: 'phone', value: dto.phone, isPrimary: true },
        });
      }

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'patient.registered',
        resourceType: 'Patient',
        resourceId: created.id,
        metadata: { possibleDuplicateCount: candidates.length },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientRegistered', { patientId: created.id });

      return { patient: created, openedMergeCaseIds: [] as string[] };
    });

    // Opened as separate, best-effort operations outside the patient's own
    // creation transaction — a MergeCase failing to open must never roll
    // back (or block) the actual patient registration.
    for (const candidate of candidates) {
      if (candidate.score < AUTO_FLAG_THRESHOLD) continue;
      try {
        const mergeCase = await this.mergeCases.openOrGetExisting({
          patientAId: patient.id,
          patientBId: candidate.patientId,
          matchScore: candidate.score,
          matchReason: { reasons: candidate.reasons },
          actorId,
        });
        openedMergeCaseIds.push(mergeCase.id);
      } catch {
        // Best-effort — see comment above.
      }
    }

    return { ...patient, possibleDuplicates: candidates, openedMergeCaseIds };
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { identifiers: true, contacts: true },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }

  /**
   * Read-only search/match — returns ranked candidates for human review. It
   * never merges or modifies anything; callers decide whether to treat a
   * result as "this is the existing patient" or to open/confirm a MergeCase.
   */
  async search(query: { firstName: string; lastName: string; dateOfBirth: string; nationalId?: string; phone?: string }) {
    return this.matching.findCandidates({
      firstName: query.firstName,
      lastName: query.lastName,
      dateOfBirth: new Date(query.dateOfBirth),
      nationalId: query.nationalId,
      phone: query.phone,
    });
  }

  async addIdentifier(patientId: string, dto: AddIdentifierDto, actorId: string) {
    await this.findById(patientId);

    return this.prisma.$transaction(async (tx) => {
      const identifier = await tx.patientIdentifier.create({
        data: { patientId, ...dto },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'patient_identifier.added',
        resourceType: 'PatientIdentifier',
        resourceId: identifier.id,
        metadata: { type: dto.type },
      });

      return identifier;
    });
  }

  async addContact(patientId: string, dto: AddContactDto, actorId: string) {
    await this.findById(patientId);

    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.patientContact.create({ data: { patientId, ...dto } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'patient_contact.added',
        resourceType: 'PatientContact',
        resourceId: contact.id,
        metadata: { type: dto.type },
      });

      return contact;
    });
  }

  async recordConsent(patientId: string, dto: RecordConsentDto, actorId: string) {
    await this.findById(patientId);

    return this.prisma.$transaction(async (tx) => {
      const consent = await tx.consent.create({
        data: {
          patientId,
          purpose: dto.purpose,
          scope: (dto.scope ?? {}) as Prisma.InputJsonValue,
          grantedBy: actorId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'consent.recorded',
        resourceType: 'Consent',
        resourceId: consent.id,
        metadata: { purpose: dto.purpose },
      });

      return consent;
    });
  }

  async withdrawConsent(patientId: string, consentId: string, actorId: string) {
    const consent = await this.prisma.consent.findFirst({ where: { id: consentId, patientId } });
    if (!consent) throw new NotFoundException('Consent record not found.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.consent.update({
        where: { id: consentId },
        data: { withdrawnAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'consent.withdrawn',
        resourceType: 'Consent',
        resourceId: consentId,
      });

      return updated;
    });
  }

  async createAccessGrant(patientId: string, dto: CreateAccessGrantDto, actorId: string) {
    await this.findById(patientId);

    return this.prisma.$transaction(async (tx) => {
      const grant = await tx.accessGrant.create({
        data: {
          patientId,
          granteeUserId: dto.granteeUserId,
          relationship: dto.relationship,
          scope: (dto.scope ?? {}) as Prisma.InputJsonValue,
          grantedBy: actorId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'access_grant.created',
        resourceType: 'AccessGrant',
        resourceId: grant.id,
        metadata: { granteeUserId: dto.granteeUserId, relationship: dto.relationship },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientAccessGranted', {
        patientId,
        granteeUserId: dto.granteeUserId,
      });

      return grant;
    });
  }

  async revokeAccessGrant(patientId: string, grantId: string, actorId: string) {
    const grant = await this.prisma.accessGrant.findFirst({ where: { id: grantId, patientId } });
    if (!grant) throw new NotFoundException('Access grant not found.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.accessGrant.update({
        where: { id: grantId },
        data: { revokedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: patientId,
        action: 'access_grant.revoked',
        resourceType: 'AccessGrant',
        resourceId: grantId,
      });

      return updated;
    });
  }
}
