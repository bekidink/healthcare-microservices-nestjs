import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabResultsService } from './lab-results.service';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('lab-results')
@Controller()
export class LabResultsController {
  constructor(private readonly labResultsService: LabResultsService) {}

  @ApiOperation({ summary: 'Enter the result for an ordered test' })
  @Post('lab-order-items/:labOrderItemId/results')
  create(
    @Param('labOrderItemId') labOrderItemId: string,
    @Body() dto: CreateLabResultDto,
    @ActorId() actorId: string
  ) {
    return this.labResultsService.create(labOrderItemId, dto, actorId);
  }

  @ApiOperation({
    summary: 'Correct a previously entered result',
    description:
      'Never overwrites the original — inserts a new result referencing the old one, and marks the old one ' +
      '"corrected" without touching its recorded value. Fails if the result you\'re correcting has itself ' +
      'already been superseded by a later correction.',
  })
  @Post('results/:id/correct')
  correct(@Param('id') id: string, @Body() dto: CreateLabResultDto, @ActorId() actorId: string) {
    return this.labResultsService.correct(id, dto, actorId);
  }
}
