import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { assertBedTransition } from './bed-transitions';
import type { CreateWardDto } from './dto/create-ward.dto';
import type { CreateBedDto } from './dto/create-bed.dto';

@Injectable()
export class WardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async createWard(dto: CreateWardDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ward = await tx.ward.create({ data: { ...dto } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.facilityId,
        action: 'ward.created',
        resourceType: 'Ward',
        resourceId: ward.id,
      });

      return ward;
    });
  }

  async listWards(facilityId?: string) {
    if (!facilityId) return [];
    return this.prisma.ward.findMany({ where: { facilityId }, include: { beds: true } });
  }

  async findWardById(wardId: string) {
    const ward = await this.prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) throw new NotFoundException('Ward not found.');
    return ward;
  }

  async createBed(wardId: string, dto: CreateBedDto, actorId: string) {
    const ward = await this.findWardById(wardId);

    const existing = await this.prisma.bed.findUnique({
      where: { wardId_bedNumber: { wardId, bedNumber: dto.bedNumber } },
    });
    if (existing) throw new BadRequestException(`Bed "${dto.bedNumber}" already exists in this ward.`);

    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.create({ data: { wardId, bedNumber: dto.bedNumber } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: ward.facilityId,
        action: 'bed.created',
        resourceType: 'Bed',
        resourceId: bed.id,
      });

      return bed;
    });
  }

  async listBeds(wardId: string) {
    await this.findWardById(wardId);
    return this.prisma.bed.findMany({ where: { wardId }, orderBy: { bedNumber: 'asc' } });
  }

  async findBedById(id: string) {
    const bed = await this.prisma.bed.findUnique({ where: { id } });
    if (!bed) throw new NotFoundException('Bed not found.');
    return bed;
  }

  /** Flips a bed from cleaning back to available — the only way a bed re-enters circulation after a discharge/transfer-out. */
  async markAvailable(id: string, actorId: string) {
    const bed = await this.findBedById(id);
    assertBedTransition(bed.status, 'available');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bed.update({ where: { id }, data: { status: 'available' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: bed.wardId,
        action: 'bed.marked_available',
        resourceType: 'Bed',
        resourceId: id,
      });

      return updated;
    });
  }
}
