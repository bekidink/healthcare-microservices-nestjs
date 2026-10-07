import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SpecimensService } from './specimens.service';
import { CollectSpecimenDto } from './dto/collect-specimen.dto';
import { RejectSpecimenDto } from './dto/reject-specimen.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('specimens')
@Controller()
export class SpecimensController {
  constructor(private readonly specimensService: SpecimensService) {}

  @ApiOperation({ summary: 'Record a specimen collected for a lab order (moves the order to in_progress)' })
  @Post('lab-orders/:labOrderId/specimens')
  collect(@Param('labOrderId') labOrderId: string, @Body() dto: CollectSpecimenDto, @ActorId() actorId: string) {
    return this.specimensService.collect(labOrderId, dto, actorId);
  }

  @ApiOperation({ summary: 'Mark a specimen received by the lab' })
  @Post('specimens/:id/receive')
  receive(@Param('id') id: string, @ActorId() actorId: string) {
    return this.specimensService.receive(id, actorId);
  }

  @ApiOperation({ summary: 'Reject a specimen (e.g. hemolyzed, mislabeled, insufficient volume)' })
  @Post('specimens/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectSpecimenDto, @ActorId() actorId: string) {
    return this.specimensService.reject(id, dto, actorId);
  }
}
