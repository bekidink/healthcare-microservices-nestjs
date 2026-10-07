import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';

@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  private async getNoteOrThrow(id: string) {
    const note = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Clinical note not found.');
    return note;
  }

  /** Core rule: never overwrite a signed clinical record. Every mutation but creation and signing itself goes through this. */
  private assertEditable(note: { signedAt: Date | null }) {
    if (note.signedAt) {
      throw new BadRequestException('This clinical note is signed and can no longer be modified.');
    }
  }

  async create(encounterId: string, dto: CreateClinicalNoteDto, actorId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Encounter not found.');

    return this.prisma.clinicalNote.create({
      data: {
        encounterId,
        noteType: dto.noteType ?? 'soap',
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        authorId: actorId,
      },
    });
  }

  async update(id: string, dto: CreateClinicalNoteDto) {
    const note = await this.getNoteOrThrow(id);
    this.assertEditable(note);

    return this.prisma.clinicalNote.update({
      where: { id },
      data: {
        noteType: dto.noteType ?? note.noteType,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
      },
    });
  }

  async sign(id: string, actorId: string) {
    const note = await this.getNoteOrThrow(id);
    this.assertEditable(note);

    return this.prisma.$transaction(async (tx) => {
      const signed = await tx.clinicalNote.update({
        where: { id },
        data: { signedAt: new Date(), signedBy: actorId },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'clinical_note.signed',
        resourceType: 'ClinicalNote',
        resourceId: id,
        metadata: { encounterId: note.encounterId },
      });

      return signed;
    });
  }

  async list(encounterId: string) {
    return this.prisma.clinicalNote.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
