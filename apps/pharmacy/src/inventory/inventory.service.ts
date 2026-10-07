import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { Prisma } from '../../generated/client';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { ReceiveStockDto } from './dto/receive-stock.dto';
import type { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateInventoryItemDto, actorId: string) {
    const item = await this.prisma.inventoryItem.create({
      data: {
        facilityId: dto.facilityId,
        medicationCode: dto.medicationCode,
        medicationName: dto.medicationName,
        reorderLevel: dto.reorderLevel ?? 0,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId,
        contextId: dto.facilityId,
        action: 'inventory_item.created',
        resourceType: 'InventoryItem',
        resourceId: item.id,
      },
    });

    return item;
  }

  async findById(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { ledgerEntries: { orderBy: { performedAt: 'desc' } } },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return item;
  }

  async listByFacility(facilityId: string) {
    return this.prisma.inventoryItem.findMany({ where: { facilityId } });
  }

  /**
   * Core rule: "Pharmacy stock changes must create ledger movements."
   * quantityOnHand only ever moves through this one method — DispenseService
   * calls it too, passing its own transaction client, so a dispense's stock
   * decrement and its PrescriptionItem update commit atomically together.
   * There is no other path in this codebase that writes quantityOnHand.
   */
  async applyMovement(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
    quantityDelta: number,
    movementType: string,
    actorId: string,
    extra?: { referenceType?: string; referenceId?: string; notes?: string }
  ) {
    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) throw new NotFoundException('Inventory item not found.');

    const balanceAfter = item.quantityOnHand + quantityDelta;
    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Insufficient stock: ${item.medicationName} has ${item.quantityOnHand} on hand, cannot move ${quantityDelta}.`
      );
    }

    const updated = await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantityOnHand: balanceAfter },
    });

    const ledgerEntry = await tx.stockLedgerEntry.create({
      data: {
        inventoryItemId,
        movementType,
        quantityDelta,
        balanceAfter,
        performedBy: actorId,
        referenceType: extra?.referenceType,
        referenceId: extra?.referenceId,
        notes: extra?.notes,
      },
    });

    await this.auditOutbox.recordAudit(tx, {
      actorId,
      contextId: item.facilityId,
      action: `stock.${movementType}`,
      resourceType: 'InventoryItem',
      resourceId: inventoryItemId,
      metadata: { quantityDelta, balanceAfter, ledgerEntryId: ledgerEntry.id },
    });

    return { item: updated, ledgerEntry };
  }

  async receive(id: string, dto: ReceiveStockDto, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, id, dto.quantity, 'receipt', actorId, { notes: dto.notes })
    );
  }

  async adjust(id: string, dto: AdjustStockDto, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, id, dto.quantityDelta, dto.movementType, actorId, { notes: dto.reason })
    );
  }
}
