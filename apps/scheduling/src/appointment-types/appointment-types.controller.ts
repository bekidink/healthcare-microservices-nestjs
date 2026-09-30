import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentTypesService } from './appointment-types.service';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('appointment-types')
@Controller('appointment-types')
export class AppointmentTypesController {
  constructor(private readonly appointmentTypesService: AppointmentTypesService) {}

  @ApiOperation({ summary: 'Create a bookable appointment type for a facility' })
  @Post()
  create(@Body() dto: CreateAppointmentTypeDto, @ActorId() actorId: string) {
    return this.appointmentTypesService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'List active appointment types for a facility' })
  @Get()
  list(@Query('facilityId') facilityId: string) {
    return this.appointmentTypesService.listByFacility(facilityId);
  }
}
