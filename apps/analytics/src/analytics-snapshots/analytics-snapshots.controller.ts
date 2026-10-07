import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsSnapshotsService } from './analytics-snapshots.service';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { ActorId } from '../common/actor.decorator';

// Left open (no JwtVerifyGuard) — this is a reporting tool, not a mutation
// of clinical/financial state. See AiToolsController for the guarded
// controller.
@ApiTags('analytics-snapshots')
@Controller('analytics/snapshots')
export class AnalyticsSnapshotsController {
  constructor(private readonly snapshotsService: AnalyticsSnapshotsService) {}

  @ApiOperation({
    summary: 'Compute and persist a point-in-time analytics snapshot',
    description:
      'Computes fresh from the owning service\'s real REST API (e.g. Pharmacy\'s GET /inventory-items) and ' +
      'inserts a new snapshot row — never recalculates or overwrites a past one.',
  })
  @Post()
  create(@Body() dto: CreateSnapshotDto, @ActorId() actorId: string) {
    return this.snapshotsService.compute(dto, actorId);
  }

  @ApiOperation({ summary: 'List historical snapshots' })
  @Get()
  list(@Query('snapshotType') snapshotType?: string, @Query('facilityId') facilityId?: string) {
    return this.snapshotsService.list(snapshotType, facilityId);
  }

  @ApiOperation({ summary: 'Get a single snapshot' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.snapshotsService.findById(id);
  }
}
