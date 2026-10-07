import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { Prisma } from '../../generated/client';
import type { CreateSupplyItemDto } from './dto/create-supply-item.dto';
import type { ReceiveSupplyDto } from './dto/receive-supply.dto';
import type { AdjustSupplyDto } from './dto/adjust-supply.dto';
import type { ConsumeSupplyDto } from './dto/consume-supply.dto';

@Injectable()
export class SupplyItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateSupplyItemDto, actorId: string) {
    const item = await this.prisma.supplyItem.create({
      data: {
        facilityId: dto.facilityId,
        itemCode: dto.itemCode,
        itemName: dto.itemName,
        reorderLevel: dto.reorderLevel ?? 0,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId,
        contextId: dto.facilityId,
        action: 'supply_item.created',
        resourceType: 'SupplyItem',
        resourceId: item.id,
      },
    });

    return item;
  }

  async findById(id: string) {
    const item = await this.prisma.supplyItem.findUnique({
      where: { id },
      include: { ledgerEntries: { orderBy: { performedAt: 'desc' } } },
    });
    if (!item) throw new NotFoundException('Supply item not found.');
    return item;
  }

  async listByFacility(facilityId: string) {
    return this.prisma.supplyItem.findMany({ where: { facilityId } });
  }

  /**
   * Core rule, reused deliberately from Pharmacy's InventoryService for
   * consistency: "supply stock changes must create ledger movements."
   * quantityOnHand only ever moves through this one method. There is no
   * other path in this codebase that writes it.
   */
  async applyMovement(
    tx: Prisma.TransactionClient,
    supplyItemId: string,
    quantityDelta: number,
    movementType: string,
    actorId: string,
    extra?: { referenceType?: string; referenceId?: string; notes?: string }
  ) {
    const item = await tx.supplyItem.findUnique({ where: { id: supplyItemId } });
    if (!item) throw new NotFoundException('Supply item not found.');

    const balanceAfter = item.quantityOnHand + quantityDelta;
    if (balanceAfter < 0) {
      throw new BadRequestException(
        `Insufficient stock: ${item.itemName} has ${item.quantityOnHand} on hand, cannot move ${quantityDelta}.`
      );
    }

    const updated = await tx.supplyItem.update({
      where: { id: supplyItemId },
      data: { quantityOnHand: balanceAfter },
    });

    const ledgerEntry = await tx.supplyLedgerEntry.create({
      data: {
        supplyItemId,
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
      action: `supply.${movementType}`,
      resourceType: 'SupplyItem',
      resourceId: supplyItemId,
      metadata: { quantityDelta, balanceAfter, ledgerEntryId: ledgerEntry.id },
    });

    return { item: updated, ledgerEntry };
  }

  async receive(id: string, dto: ReceiveSupplyDto, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, id, dto.quantity, 'receipt', actorId, { notes: dto.notes })
    );
  }

  async adjust(id: string, dto: AdjustSupplyDto, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, id, dto.quantityDelta, dto.movementType, actorId, { notes: dto.reason })
    );
  }

  async consume(id: string, dto: ConsumeSupplyDto, actorId: string) {
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, id, -dto.quantity, 'consumption', actorId, {
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      })
    );
  }
}
