import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('encounters')
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @ApiOperation({
    summary: 'Start a clinical encounter',
    description:
      'Pass appointmentId to start an encounter for a checked-in appointment (patient/provider/facility are ' +
      'derived from it over REST), or patientId+providerId+facilityId directly for a walk-in with no appointment.',
  })
  @Post()
  create(@Body() dto: CreateEncounterDto, @ActorId() actorId: string) {
    return this.encountersService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'List a patient\'s encounters (continuity-of-care history)' })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.encountersService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get an encounter with its vitals, notes, and diagnoses' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.encountersService.findById(id);
  }

  @ApiOperation({ summary: 'Complete an encounter' })
  @Post(':id/complete')
  complete(@Param('id') id: string, @ActorId() actorId: string) {
    return this.encountersService.complete(id, actorId);
  }

  @ApiOperation({ summary: 'Cancel an encounter' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @ActorId() actorId: string) {
    return this.encountersService.cancel(id, actorId);
  }
}
