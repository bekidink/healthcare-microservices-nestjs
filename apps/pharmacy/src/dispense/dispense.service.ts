import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import type { CreateDispenseDto } from './dto/create-dispense.dto';

@Injectable()
export class DispenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly inventoryService: InventoryService,
    private readonly prescriptionsService: PrescriptionsService
  ) {}

  async create(prescriptionItemId: string, dto: CreateDispenseDto, actorId: string) {
    const item = await this.prisma.prescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      include: { prescription: true },
    });
    if (!item) throw new NotFoundException('Prescription item not found.');
    if (item.status === 'dispensed') throw new BadRequestException('This item has already been dispensed.');
    if (item.status === 'cancelled') throw new BadRequestException('Cannot dispense a cancelled prescription item.');

    const inventoryItem = await this.prisma.inventoryItem.findUnique({ where: { id: dto.inventoryItemId } });
    if (!inventoryItem) throw new NotFoundException('Inventory item not found.');
    if (inventoryItem.medicationCode !== item.medicationCode) {
      throw new BadRequestException(
        `Medication mismatch: prescribed ${item.medicationCode} (${item.medicationName}), but inventory item ${dto.inventoryItemId} is ${inventoryItem.medicationCode} (${inventoryItem.medicationName}).`
      );
    }

    const quantity = dto.quantity ?? item.quantityPrescribed;

    const dispense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispense.create({
        data: {
          prescriptionItemId,
          inventoryItemId: dto.inventoryItemId,
          quantityDispensed: quantity,
          dispensedBy: actorId,
        },
      });

      await tx.prescriptionItem.update({ where: { id: prescriptionItemId }, data: { status: 'dispensed' } });

      // Same transaction as the PrescriptionItem update above — a dispense
      // and its stock decrement either both happen or neither does.
      await this.inventoryService.applyMovement(tx, dto.inventoryItemId, -quantity, 'dispense', actorId, {
        referenceType: 'PrescriptionItem',
        referenceId: prescriptionItemId,
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: item.prescription.facilityId,
        action: 'prescription_item.dispensed',
        resourceType: 'Dispense',
        resourceId: created.id,
        metadata: { prescriptionItemId, inventoryItemId: dto.inventoryItemId, quantity },
      });
      await this.auditOutbox.publishEvent(tx, 'PrescriptionDispensed', {
        dispenseId: created.id,
        prescriptionId: item.prescriptionId,
        patientId: item.prescription.patientId,
      });

      return created;
    });

    await this.prescriptionsService.markDispensedIfAllItemsDispensed(item.prescriptionId);
    return dispense;
  }
}
