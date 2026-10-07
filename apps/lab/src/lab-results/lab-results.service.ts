import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { LabOrdersService } from '../lab-orders/lab-orders.service';
import type { CreateLabResultDto } from './dto/create-lab-result.dto';

@Injectable()
export class LabResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly labOrdersService: LabOrdersService
  ) {}

  async create(labOrderItemId: string, dto: CreateLabResultDto, actorId: string) {
    const item = await this.prisma.labOrderItem.findUnique({
      where: { id: labOrderItemId },
      include: { labOrder: true },
    });
    if (!item) throw new NotFoundException('Lab order item not found.');
    if (item.status === 'resulted') {
      throw new BadRequestException('This item already has a result — use POST /results/:id/correct to amend it.');
    }
    if (item.status === 'cancelled') {
      throw new BadRequestException('Cannot result a cancelled lab order item.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.labResult.create({
        data: {
          labOrderItemId,
          value: dto.value,
          unit: dto.unit,
          referenceRange: dto.referenceRange,
          abnormalFlag: dto.abnormalFlag ?? 'normal',
          resultedBy: actorId,
        },
      });

      await tx.labOrderItem.update({ where: { id: labOrderItemId }, data: { status: 'resulted' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: item.labOrder.facilityId,
        action: 'lab_result.entered',
        resourceType: 'LabResult',
        resourceId: created.id,
        metadata: { labOrderItemId, abnormalFlag: created.abnormalFlag },
      });
      await this.auditOutbox.publishEvent(tx, 'LabResultEntered', {
        labResultId: created.id,
        labOrderId: item.labOrderId,
        patientId: item.labOrder.patientId,
        abnormalFlag: created.abnormalFlag,
      });

      return created;
    });

    await this.labOrdersService.completeIfAllItemsResulted(item.labOrderId);
    return result;
  }

  /**
   * Core rule: never overwrite a corrected lab result. This never touches the
   * existing row's value/unit/referenceRange — it inserts a new LabResult
   * referencing the old one via correctsResultId, and only flips the old
   * row's status to "corrected" as an administrative marker. The full
   * history (what was reported, when, and what superseded it) always stays
   * reconstructable.
   */
  async correct(resultId: string, dto: CreateLabResultDto, actorId: string) {
    const original = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: { labOrderItem: { include: { labOrder: true } } },
    });
    if (!original) throw new NotFoundException('Lab result not found.');
    if (original.status === 'corrected') {
      const superseding = await this.prisma.labResult.findUnique({ where: { correctsResultId: original.id } });
      throw new BadRequestException(
        `This result was already corrected${superseding ? ` by result ${superseding.id}` : ''} — correct that one instead, not this superseded one.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const correction = await tx.labResult.create({
        data: {
          labOrderItemId: original.labOrderItemId,
          value: dto.value,
          unit: dto.unit,
          referenceRange: dto.referenceRange,
          abnormalFlag: dto.abnormalFlag ?? 'normal',
          resultedBy: actorId,
          correctsResultId: original.id,
        },
      });

      await tx.labResult.update({ where: { id: original.id }, data: { status: 'corrected' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: original.labOrderItem.labOrder.facilityId,
        action: 'lab_result.corrected',
        resourceType: 'LabResult',
        resourceId: correction.id,
        metadata: { correctsResultId: original.id, labOrderItemId: original.labOrderItemId },
      });
      await this.auditOutbox.publishEvent(tx, 'LabResultCorrected', {
        labResultId: correction.id,
        correctsResultId: original.id,
        labOrderId: original.labOrderItem.labOrderId,
        patientId: original.labOrderItem.labOrder.patientId,
      });

      return correction;
    });
  }
}
