import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabOrdersService } from './lab-orders.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('lab-orders')
@Controller('lab-orders')
export class LabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  @ApiOperation({
    summary: 'Order one or more lab tests',
    description:
      'Pass encounterId to order against an in-progress encounter (patient/provider/facility are derived from ' +
      'it over REST), or patientId+providerId+facilityId directly for a standalone order.',
  })
  @Post()
  create(@Body() dto: CreateLabOrderDto, @ActorId() actorId: string) {
    return this.labOrdersService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's lab orders" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.labOrdersService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get a lab order with its items, their results, and specimens' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.labOrdersService.findById(id);
  }

  @ApiOperation({ summary: 'Cancel a lab order (any items not yet resulted are cancelled too)' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @ActorId() actorId: string) {
    return this.labOrdersService.cancel(id, actorId);
  }
}
