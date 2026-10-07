import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { EmergencyVisitsService } from './emergency-visits.service';
import { CreateEmergencyVisitDto } from './dto/create-emergency-visit.dto';
import { AdmitEmergencyVisitDto } from './dto/admit-emergency-visit.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('emergency-visits')
@UseGuards(JwtVerifyGuard)
@Controller('emergency-visits')
export class EmergencyVisitsController {
  constructor(private readonly emergencyVisitsService: EmergencyVisitsService) {}

  @ApiOperation({ summary: 'Register an ER arrival with its initial triage level (1 most critical - 5 least)' })
  @Post()
  create(@Body() dto: CreateEmergencyVisitDto, @ActorId() actorId: string) {
    return this.emergencyVisitsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'List emergency visits, optionally filtered by facility and/or status' })
  @Get()
  list(@Query('facilityId') facilityId?: string, @Query('status') status?: string) {
    return this.emergencyVisitsService.list(facilityId, status);
  }

  @ApiOperation({ summary: 'Get an emergency visit' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emergencyVisitsService.findById(id);
  }

  @ApiOperation({ summary: 'Admit this ER patient into a specific (available) bed — creates a real Admission' })
  @Post(':id/admit')
  admit(@Param('id') id: string, @Body() dto: AdmitEmergencyVisitDto, @ActorId() actorId: string) {
    return this.emergencyVisitsService.admit(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Discharge straight from the ER with no admission' })
  @Post(':id/discharge')
  discharge(@Param('id') id: string, @ActorId() actorId: string) {
    return this.emergencyVisitsService.discharge(id, actorId);
  }
}
