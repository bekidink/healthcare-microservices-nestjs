import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleSlotsService } from './schedule-slots.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('schedule-slots')
@Controller('schedule-slots')
export class ScheduleSlotsController {
  constructor(private readonly scheduleSlotsService: ScheduleSlotsService) {}

  @ApiOperation({ summary: 'Create a single bookable slot directly' })
  @Post()
  create(@Body() dto: CreateScheduleSlotDto, @ActorId() actorId: string) {
    return this.scheduleSlotsService.create(dto, actorId);
  }

  @ApiOperation({
    summary: "Expand a provider's recurring weekly schedule (from Facility) into concrete bookable slots",
    description: 'Fetches the department\'s ProviderSchedule entries from the Facility service and generates one ScheduleSlot per slotDurationMins window on each matching day of week in range.',
  })
  @Post('generate')
  generate(@Body() dto: GenerateSlotsDto, @ActorId() actorId: string) {
    return this.scheduleSlotsService.generateFromFacilitySchedule(dto, actorId);
  }

  @ApiOperation({ summary: 'List open (bookable) slots, optionally filtered by provider/facility/department/date' })
  @Get()
  list(
    @Query('providerId') providerId?: string,
    @Query('facilityId') facilityId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string
  ) {
    return this.scheduleSlotsService.list({ providerId, facilityId, departmentId, date, status });
  }

  @ApiOperation({ summary: 'Get a slot' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleSlotsService.findById(id);
  }
}
