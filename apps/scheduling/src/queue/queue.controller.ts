import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { ActorId } from '../common/actor.decorator';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @ApiOperation({ summary: "List a facility/department's active queue (waiting, called, in service), ordered by queue number" })
  @Get()
  list(
    @Query('facilityId') facilityId: string,
    @Query('departmentId') departmentId?: string,
    @Query('date') date?: string
  ) {
    return this.queueService.list({ facilityId, departmentId, date });
  }

  @ApiOperation({ summary: "Announce a patient's queue number (waiting -> called)" })
  @Post(':id/call')
  call(@Param('id') id: string, @ActorId() actorId: string) {
    return this.queueService.call(id, actorId);
  }
}
