import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VitalsService } from './vitals.service';
import { RecordVitalsDto } from './dto/record-vitals.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('vitals')
@Controller()
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @ApiOperation({ summary: 'Record a set of vital signs for an encounter' })
  @Post('encounters/:encounterId/vitals')
  record(@Param('encounterId') encounterId: string, @Body() dto: RecordVitalsDto, @ActorId() actorId: string) {
    return this.vitalsService.record(encounterId, dto, actorId);
  }

  @ApiOperation({ summary: 'List all vitals recorded for an encounter' })
  @Get('encounters/:encounterId/vitals')
  list(@Param('encounterId') encounterId: string) {
    return this.vitalsService.list(encounterId);
  }
}
