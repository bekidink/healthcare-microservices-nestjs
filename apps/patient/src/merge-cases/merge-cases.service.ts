import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { Prisma } from '../../generated/client';
import type { ConfirmMergeCaseDto } from './dto/confirm-merge-case.dto';
import type { RejectMergeCaseDto } from './dto/reject-merge-case.dto';

@Injectable()
export class MergeCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  /**
   * Opens a review case for a candidate-duplicate pair, or returns the
   * existing open case for that same pair if one already exists — never
   * creates duplicate open cases for the same two patients, and never
   * merges anything itself. This is the ONLY way a MergeCase gets created,
   * whether triggered by an explicit API call or automatically during
   * patient registration when a high-confidence match is found.
   */
  async openOrGetExisting(params: {
    patientAId: string;
    patientBId: string;
    matchScore: number;
    matchReason: Record<string, unknown>;
    actorId: string;
  }) {
    if (params.patientAId === params.patientBId) {
      throw new BadRequestException('A patient cannot be compared against itself.');
    }

    const existing = await this.prisma.mergeCase.findFirst({
      where: {
        status: 'open',
        OR: [
          { patientAId: params.patientAId, patientBId: params.patientBId },
          { patientAId: params.patientBId, patientBId: params.patientAId },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const mergeCase = await tx.mergeCase.create({
        data: {
          patientAId: params.patientAId,
          patientBId: params.patientBId,
          matchScore: params.matchScore,
          matchReason: params.matchReason as Prisma.InputJsonValue,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId: params.actorId,
        action: 'merge_case.opened',
        resourceType: 'MergeCase',
        resourceId: mergeCase.id,
        metadata: { patientAId: params.patientAId, patientBId: params.patientBId, matchScore: params.matchScore },
      });
      await this.auditOutbox.publishEvent(tx, 'MergeCaseOpened', {
        mergeCaseId: mergeCase.id,
        patientAId: params.patientAId,
        patientBId: params.patientBId,
        matchScore: params.matchScore,
      });

      return mergeCase;
    });
  }

  async findById(id: string) {
    const mergeCase = await this.prisma.mergeCase.findUnique({ where: { id } });
    if (!mergeCase) throw new NotFoundException('Merge case not found.');
    return mergeCase;
  }

  /**
   * The only path by which two patients actually get merged — requires an
   * explicit, human-authorized call naming which patient survives. Moves
   * identifiers/contacts/consents/access-grants onto the survivor and marks
   * the other patient MERGED (never deleted — PRD: "preserve source
   * histories" / "Immutable identity history").
   */
  async confirm(id: string, dto: ConfirmMergeCaseDto, actorId: string) {
    const mergeCase = await this.findById(id);
    if (mergeCase.status !== 'open') {
      throw new BadRequestException(`Merge case is already ${mergeCase.status}.`);
    }
    if (![mergeCase.patientAId, mergeCase.patientBId].includes(dto.survivorPatientId)) {
      throw new BadRequestException('survivorPatientId must be one of the two patients on this case.');
    }

    const mergedPatientId =
      dto.survivorPatientId === mergeCase.patientAId ? mergeCase.patientBId : mergeCase.patientAId;

    const [survivor, merged] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: dto.survivorPatientId } }),
      this.prisma.patient.findUnique({ where: { id: mergedPatientId } }),
    ]);
    if (!survivor || !merged) throw new NotFoundException('One or both patients no longer exist.');
    if (survivor.status === 'merged' || merged.status === 'merged') {
      throw new BadRequestException('One of these patients has already been merged elsewhere.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.patientIdentifier.updateMany({
        where: { patientId: mergedPatientId },
        data: { patientId: dto.survivorPatientId },
      });
      await tx.patientContact.updateMany({
        where: { patientId: mergedPatientId },
        data: { patientId: dto.survivorPatientId },
      });
      await tx.consent.updateMany({
        where: { patientId: mergedPatientId },
        data: { patientId: dto.survivorPatientId },
      });
      await tx.accessGrant.updateMany({
        where: { patientId: mergedPatientId },
        data: { patientId: dto.survivorPatientId },
      });

      await tx.patient.update({
        where: { id: mergedPatientId },
        data: { status: 'merged', mergedIntoPatientId: dto.survivorPatientId },
      });

      const updatedCase = await tx.mergeCase.update({
        where: { id },
        data: {
          status: 'merged',
          survivorPatientId: dto.survivorPatientId,
          decidedBy: actorId,
          decidedAt: new Date(),
          decisionNotes: dto.notes,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'merge_case.confirmed',
        resourceType: 'MergeCase',
        resourceId: id,
        metadata: { survivorPatientId: dto.survivorPatientId, mergedPatientId },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientsMerged', {
        mergeCaseId: id,
        survivorPatientId: dto.survivorPatientId,
        mergedPatientId,
      });

      return updatedCase;
    });
  }

  async reject(id: string, dto: RejectMergeCaseDto, actorId: string) {
    const mergeCase = await this.findById(id);
    if (mergeCase.status !== 'open') {
      throw new BadRequestException(`Merge case is already ${mergeCase.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedCase = await tx.mergeCase.update({
        where: { id },
        data: {
          status: 'rejected',
          decidedBy: actorId,
          decidedAt: new Date(),
          decisionNotes: dto.notes,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'merge_case.rejected',
        resourceType: 'MergeCase',
        resourceId: id,
      });

      return updatedCase;
    });
  }
}
