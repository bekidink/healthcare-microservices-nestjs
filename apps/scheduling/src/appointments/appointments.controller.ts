import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({ summary: 'Book an appointment against an open slot (REQUESTED)' })
  @Post()
  create(@Body() dto: CreateAppointmentDto, @ActorId() actorId: string) {
    return this.appointmentsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get an appointment (with its slot and queue entry)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @ApiOperation({ summary: 'REQUESTED -> CONFIRMED' })
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @ActorId() actorId: string) {
    return this.appointmentsService.confirm(id, actorId);
  }

  @ApiOperation({ summary: 'CONFIRMED -> CHECKED_IN (also opens a QueueEntry)' })
  @Post(':id/check-in')
  checkIn(@Param('id') id: string, @ActorId() actorId: string) {
    return this.appointmentsService.checkIn(id, actorId);
  }

  @ApiOperation({ summary: 'CHECKED_IN -> IN_SERVICE' })
  @Post(':id/start')
  start(@Param('id') id: string, @ActorId() actorId: string) {
    return this.appointmentsService.start(id, actorId);
  }

  @ApiOperation({ summary: 'IN_SERVICE -> COMPLETED' })
  @Post(':id/complete')
  complete(@Param('id') id: string, @ActorId() actorId: string) {
    return this.appointmentsService.complete(id, actorId);
  }

  @ApiOperation({ summary: 'Cancel from any pre-completion state — reopens the slot for rebooking' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelAppointmentDto, @ActorId() actorId: string) {
    return this.appointmentsService.cancel(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Mark as NO_SHOW from CONFIRMED/CHECKED_IN — does not reopen the slot' })
  @Post(':id/no-show')
  noShow(@Param('id') id: string, @ActorId() actorId: string) {
    return this.appointmentsService.noShow(id, actorId);
  }
}
