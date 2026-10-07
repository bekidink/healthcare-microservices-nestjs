import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateProblemDto } from './dto/create-problem.dto';

@Injectable()
export class ProblemListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateProblemDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const problem = await tx.problemListEntry.create({
        data: {
          patientId: dto.patientId,
          code: dto.code,
          description: dto.description,
          status: dto.status ?? 'active',
          onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.patientId,
        action: 'problem.recorded',
        resourceType: 'ProblemListEntry',
        resourceId: problem.id,
      });

      return problem;
    });
  }

  async listByPatient(patientId: string) {
    return this.prisma.problemListEntry.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async resolve(id: string, actorId: string) {
    const problem = await this.prisma.problemListEntry.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Problem list entry not found.');
    if (problem.status === 'resolved') throw new BadRequestException('This problem is already resolved.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.problemListEntry.update({
        where: { id },
        data: { status: 'resolved', resolvedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: problem.patientId,
        action: 'problem.resolved',
        resourceType: 'ProblemListEntry',
        resourceId: id,
      });

      return updated;
    });
  }
}
