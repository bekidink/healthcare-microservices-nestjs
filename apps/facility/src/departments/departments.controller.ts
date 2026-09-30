import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { AssignProviderDto } from './dto/assign-provider.dto';
import { CreateProviderScheduleDto } from './dto/create-provider-schedule.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('departments')
@Controller()
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({ summary: 'Create a department within a facility' })
  @Post('facilities/:facilityId/departments')
  create(@Param('facilityId') facilityId: string, @Body() dto: CreateDepartmentDto, @ActorId() actorId: string) {
    return this.departmentsService.create(facilityId, dto, actorId);
  }

  @ApiOperation({ summary: 'Get a department (rooms, services, provider assignments, schedules)' })
  @Get('departments/:id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findById(id);
  }

  @ApiOperation({ summary: 'Add a room to a department' })
  @Post('departments/:id/rooms')
  createRoom(@Param('id') id: string, @Body() dto: CreateRoomDto, @ActorId() actorId: string) {
    return this.departmentsService.createRoom(id, dto, actorId);
  }

  @ApiOperation({ summary: "List a department's rooms" })
  @Get('departments/:id/rooms')
  listRooms(@Param('id') id: string) {
    return this.departmentsService.listRooms(id);
  }

  @ApiOperation({ summary: 'Assign a provider (Identity-service user id) to a department' })
  @Post('departments/:id/providers')
  assignProvider(@Param('id') id: string, @Body() dto: AssignProviderDto, @ActorId() actorId: string) {
    return this.departmentsService.assignProvider(id, dto, actorId);
  }

  @ApiOperation({ summary: "Add a recurring weekly schedule slot for a provider in this department" })
  @Post('departments/:id/schedules')
  createSchedule(@Param('id') id: string, @Body() dto: CreateProviderScheduleDto, @ActorId() actorId: string) {
    return this.departmentsService.createSchedule(id, dto, actorId);
  }
}
