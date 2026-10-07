import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FhirService } from './fhir.service';
import { ActorId } from '../common/actor.decorator';

// Route segments are deliberately capitalized (Patient/Encounter/Observation)
// to match FHIR R4 resource-type naming convention — NestJS/Express routes
// are case-sensitive, so these produce exactly GET /fhir/Patient/:id,
// GET /fhir/Encounter/:id and GET /fhir/Observation.
@ApiTags('fhir')
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @ApiOperation({ summary: 'Get a FHIR R4 Patient resource, translated from the Patient service' })
  @Get('Patient/:id')
  getPatient(@Param('id') id: string, @ActorId() actorId: string) {
    return this.fhirService.getPatient(id, actorId);
  }

  @ApiOperation({ summary: 'Get a FHIR R4 Encounter resource, translated from the Clinical service' })
  @Get('Encounter/:id')
  getEncounter(@Param('id') id: string, @ActorId() actorId: string) {
    return this.fhirService.getEncounter(id, actorId);
  }

  @ApiOperation({
    summary: 'Get a FHIR R4 Observation searchset Bundle for an encounter\'s vital signs',
    description: 'Translates the vitals nested on the Clinical encounter response into one Observation per VitalSigns row.',
  })
  @Get('Observation')
  getObservations(@Query('encounterId') encounterId: string, @ActorId() actorId: string) {
    return this.fhirService.getObservationsByEncounter(encounterId, actorId);
  }
}
