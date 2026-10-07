import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { RecordVitalsDto } from './dto/record-vitals.dto';

@Injectable()
export class VitalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  private async getEncounterOrThrow(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Encounter not found.');
    return encounter;
  }

  async record(encounterId: string, dto: RecordVitalsDto, actorId: string) {
    const encounter = await this.getEncounterOrThrow(encounterId);

    return this.prisma.$transaction(async (tx) => {
      const vitals = await tx.vitalSigns.create({
        data: { encounterId, ...dto, recordedBy: actorId },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: encounter.facilityId,
        action: 'vitals.recorded',
        resourceType: 'VitalSigns',
        resourceId: vitals.id,
        metadata: { encounterId },
      });

      return vitals;
    });
  }

  async list(encounterId: string) {
    await this.getEncounterOrThrow(encounterId);
    return this.prisma.vitalSigns.findMany({
      where: { encounterId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
