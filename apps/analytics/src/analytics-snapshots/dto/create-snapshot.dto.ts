import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

// Only inventory_levels is wired to a real, reachable endpoint today
// (Pharmacy's GET /inventory-items?facilityId=). Deliberately not adding
// other snapshotType values until their underlying data is actually
// reachable through an existing domain service's real REST API — see the
// milestone note in AnalyticsSnapshotsService.
const SNAPSHOT_TYPES = ['inventory_levels'] as const;

export class CreateSnapshotDto {
  @ApiProperty({ enum: SNAPSHOT_TYPES, example: 'inventory_levels' })
  @IsIn(SNAPSHOT_TYPES)
  snapshotType!: (typeof SNAPSHOT_TYPES)[number];

  @ApiProperty({ description: 'Facility to compute the snapshot for.' })
  @IsString()
  facilityId!: string;
}
