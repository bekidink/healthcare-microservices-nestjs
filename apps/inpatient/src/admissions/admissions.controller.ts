import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { AdmissionsService } from './admissions.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { DischargeAdmissionDto } from './dto/discharge-admission.dto';
import { TransferAdmissionDto } from './dto/transfer-admission.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('admissions')
@UseGuards(JwtVerifyGuard)
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @ApiOperation({ summary: 'Admit a patient into a specific (available) bed' })
  @Post()
  create(@Body() dto: CreateAdmissionDto, @ActorId() actorId: string) {
    return this.admissionsService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's admissions" })
  @Get()
  listByPatient(@Query('patientId') patientId?: string) {
    return this.admissionsService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get an admission (with its bed and transfer history)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.admissionsService.findById(id);
  }

  @ApiOperation({ summary: 'Discharge the patient — the bed goes to cleaning, not directly back to available' })
  @Post(':id/discharge')
  discharge(@Param('id') id: string, @Body() dto: DischargeAdmissionDto, @ActorId() actorId: string) {
    return this.admissionsService.discharge(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Move the admission to a new (available) bed' })
  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() dto: TransferAdmissionDto, @ActorId() actorId: string) {
    return this.admissionsService.transfer(id, dto, actorId);
  }
}
