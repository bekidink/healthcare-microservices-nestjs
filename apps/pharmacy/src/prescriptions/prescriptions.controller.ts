import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('prescriptions')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @ApiOperation({
    summary: 'Prescribe one or more medications',
    description:
      'Pass encounterId to prescribe against an in-progress encounter (patient/provider/facility are derived ' +
      'from it over REST), or patientId+providerId+facilityId directly for a standalone prescription.',
  })
  @Post()
  create(@Body() dto: CreatePrescriptionDto, @ActorId() actorId: string) {
    return this.prescriptionsService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's prescriptions" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.prescriptionsService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get a prescription with its items and their dispense status' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findById(id);
  }

  @ApiOperation({ summary: 'Cancel a prescription (any items not yet dispensed are cancelled too)' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @ActorId() actorId: string) {
    return this.prescriptionsService.cancel(id, actorId);
  }
}
