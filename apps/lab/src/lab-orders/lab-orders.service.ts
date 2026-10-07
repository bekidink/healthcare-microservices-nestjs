import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientService } from '../clinical-client/clinical-client.service';
import type { CreateLabOrderDto } from './dto/create-lab-order.dto';

// A lab order should be tied to care that's actually happening — not a
// booking that hasn't started yet.
const ENCOUNTER_STATUSES_ALLOWING_ORDER = ['in_progress', 'completed'];

@Injectable()
export class LabOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  async create(dto: CreateLabOrderDto, actorId: string) {
    let patientId = dto.patientId;
    let providerId = dto.providerId;
    let facilityId = dto.facilityId;

    if (dto.encounterId) {
      const encounter = await this.clinicalClient.getEncounter(dto.encounterId);
      if (!encounter) {
        throw new NotFoundException(`Encounter ${dto.encounterId} not found in the Clinical service.`);
      }
      if (!ENCOUNTER_STATUSES_ALLOWING_ORDER.includes(encounter.status)) {
        throw new BadRequestException(
          `Encounter ${dto.encounterId} is "${encounter.status}" — it must be in_progress (or completed) to order labs against it.`
        );
      }
      patientId = encounter.patientId;
      providerId = encounter.providerId;
      facilityId = encounter.facilityId;
    }

    if (!patientId || !providerId || !facilityId) {
      throw new BadRequestException(
        'Either encounterId, or patientId + providerId + facilityId directly (for a standalone order), are required.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.labOrder.create({
        data: {
          encounterId: dto.encounterId,
          patientId,
          providerId,
          facilityId,
          priority: dto.priority ?? 'routine',
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({ testCode: item.testCode, testName: item.testName })),
          },
        },
        include: { items: true },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'lab_order.created',
        resourceType: 'LabOrder',
        resourceId: order.id,
        metadata: { patientId, encounterId: dto.encounterId, testCodes: dto.items.map((i) => i.testCode) },
      });
      await this.auditOutbox.publishEvent(tx, 'LabOrderCreated', {
        labOrderId: order.id,
        patientId,
        facilityId,
      });

      return order;
    });
  }

  async findById(id: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        items: { include: { results: { orderBy: { resultedAt: 'desc' } } } },
        specimens: true,
      },
    });
    if (!order) throw new NotFoundException('Lab order not found.');
    return order;
  }

  async listByPatient(patientId: string) {
    return this.prisma.labOrder.findMany({
      where: { patientId },
      orderBy: { orderedAt: 'desc' },
      include: { items: true, specimens: true },
    });
  }

  /** Flips to in_progress the first time any specimen is collected — called by SpecimensService, not exposed directly. */
  async markInProgress(id: string) {
    await this.prisma.labOrder.updateMany({
      where: { id, status: 'ordered' },
      data: { status: 'in_progress' },
    });
  }

  /** Flips to completed once every item has a current (non-corrected) result — called by LabResultsService, not exposed directly. */
  async completeIfAllItemsResulted(id: string) {
    const items = await this.prisma.labOrderItem.findMany({ where: { labOrderId: id } });
    const allResulted = items.length > 0 && items.every((item) => item.status === 'resulted');
    if (allResulted) {
      await this.prisma.labOrder.updateMany({
        where: { id, status: { not: 'cancelled' } },
        data: { status: 'completed' },
      });
    }
  }

  async cancel(id: string, actorId: string) {
    const order = await this.findById(id);
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new BadRequestException(`Lab order is already "${order.status}".`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labOrder.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.labOrderItem.updateMany({
        where: { labOrderId: id, status: { not: 'resulted' } },
        data: { status: 'cancelled' },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: order.facilityId,
        action: 'lab_order.cancelled',
        resourceType: 'LabOrder',
        resourceId: id,
      });

      return updated;
    });
  }
}
