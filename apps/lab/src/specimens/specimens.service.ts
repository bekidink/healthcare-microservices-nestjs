import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { LabOrdersService } from '../lab-orders/lab-orders.service';
import type { CollectSpecimenDto } from './dto/collect-specimen.dto';
import type { RejectSpecimenDto } from './dto/reject-specimen.dto';

@Injectable()
export class SpecimensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly labOrdersService: LabOrdersService
  ) {}

  private async getSpecimenOrThrow(id: string) {
    const specimen = await this.prisma.specimen.findUnique({ where: { id } });
    if (!specimen) throw new NotFoundException('Specimen not found.');
    return specimen;
  }

  async collect(labOrderId: string, dto: CollectSpecimenDto, actorId: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id: labOrderId } });
    if (!order) throw new NotFoundException('Lab order not found.');
    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException(`Cannot collect a specimen for a lab order that is "${order.status}".`);
    }

    const specimen = await this.prisma.specimen.create({
      data: {
        labOrderId,
        specimenType: dto.specimenType,
        status: 'collected',
        collectedBy: actorId,
        collectedAt: new Date(),
      },
    });

    await this.labOrdersService.markInProgress(labOrderId);

    return specimen;
  }

  async receive(id: string, actorId: string) {
    const specimen = await this.getSpecimenOrThrow(id);
    if (specimen.status !== 'collected') {
      throw new BadRequestException(`Specimen is "${specimen.status}", not collected.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.specimen.update({ where: { id }, data: { status: 'received' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'specimen.received',
        resourceType: 'Specimen',
        resourceId: id,
        metadata: { labOrderId: specimen.labOrderId },
      });

      return updated;
    });
  }

  async reject(id: string, dto: RejectSpecimenDto, actorId: string) {
    const specimen = await this.getSpecimenOrThrow(id);
    if (specimen.status === 'rejected') {
      throw new BadRequestException('Specimen is already rejected.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.specimen.update({
        where: { id },
        data: { status: 'rejected', rejectedReason: dto.reason },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'specimen.rejected',
        resourceType: 'Specimen',
        resourceId: id,
        metadata: { labOrderId: specimen.labOrderId, reason: dto.reason },
      });

      return updated;
    });
  }
}
