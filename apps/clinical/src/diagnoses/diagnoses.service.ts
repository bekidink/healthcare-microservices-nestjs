import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateDiagnosisDto } from './dto/create-diagnosis.dto';

@Injectable()
export class DiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(encounterId: string, dto: CreateDiagnosisDto, actorId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Encounter not found.');

    return this.prisma.$transaction(async (tx) => {
      const diagnosis = await tx.diagnosis.create({
        data: {
          encounterId,
          code: dto.code,
          description: dto.description,
          type: dto.type ?? 'secondary',
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: encounter.facilityId,
        action: 'diagnosis.recorded',
        resourceType: 'Diagnosis',
        resourceId: diagnosis.id,
        metadata: { encounterId, code: dto.code },
      });

      return diagnosis;
    });
  }

  async list(encounterId: string) {
    return this.prisma.diagnosis.findMany({
      where: { encounterId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
