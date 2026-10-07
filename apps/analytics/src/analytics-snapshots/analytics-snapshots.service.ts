import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PharmacyClientService } from '../pharmacy-client/pharmacy-client.service';
import type { CreateSnapshotDto } from './dto/create-snapshot.dto';

@Injectable()
export class AnalyticsSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pharmacyClient: PharmacyClientService
  ) {}

  /**
   * Milestone note: inventory_levels is the one snapshot type implemented
   * for real right now, computed from Pharmacy's real, existing
   * GET /inventory-items?facilityId= endpoint (never a query against
   * pharmacy_db). Add further snapshotType handlers here only once their
   * underlying data is reachable through another service's real,
   * already-existing endpoint — not before.
   */
  async compute(dto: CreateSnapshotDto, actorId: string) {
    switch (dto.snapshotType) {
      case 'inventory_levels':
        return this.computeInventoryLevels(dto.facilityId, actorId);
      default:
        // Unreachable given CreateSnapshotDto's @IsIn, kept as a defensive guard.
        throw new BadRequestException(`Unsupported snapshotType "${dto.snapshotType}".`);
    }
  }

  async computeInventoryLevels(facilityId: string, _actorId: string) {
    const items = await this.pharmacyClient.listInventoryByFacility(facilityId);

    const data = {
      facilityId,
      totalItems: items.length,
      totalUnitsOnHand: items.reduce((sum, item) => sum + item.quantityOnHand, 0),
      itemsBelowReorderLevel: items
        .filter((item) => item.quantityOnHand < item.reorderLevel)
        .map((item) => ({
          id: item.id,
          medicationName: item.medicationName,
          quantityOnHand: item.quantityOnHand,
          reorderLevel: item.reorderLevel,
        })),
    };

    return this.prisma.analyticsSnapshot.create({
      data: {
        snapshotType: 'inventory_levels',
        facilityId,
        data,
      },
    });
  }

  async list(snapshotType?: string, facilityId?: string) {
    return this.prisma.analyticsSnapshot.findMany({
      where: {
        ...(snapshotType ? { snapshotType } : {}),
        ...(facilityId ? { facilityId } : {}),
      },
      orderBy: { computedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const snapshot = await this.prisma.analyticsSnapshot.findUnique({ where: { id } });
    if (!snapshot) throw new NotFoundException('Analytics snapshot not found.');
    return snapshot;
  }
}
