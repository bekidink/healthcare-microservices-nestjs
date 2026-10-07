import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermissions } from '@healthcare/shared';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityConfigurationDto } from './dto/update-configuration.dto';
import { CreateFacilityServiceDto } from './dto/create-facility-service.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('facilities')
@Controller()
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @ApiOperation({ summary: 'Create a facility under an organization — requires organization.manage' })
  @Post('organizations/:organizationId/facilities')
  @UseGuards(PermissionGuard)
  @RequirePermissions('organization.manage')
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateFacilityDto,
    @ActorId() actorId: string
  ) {
    return this.facilitiesService.create(organizationId, dto, actorId);
  }

  @ApiOperation({ summary: 'List facilities, optionally filtered by organization' })
  @Get('facilities')
  list(@Query('organizationId') organizationId?: string) {
    if (!organizationId) return [];
    return this.facilitiesService.listByOrganization(organizationId);
  }

  @ApiOperation({ summary: 'Get a facility (with its configuration, departments, services)' })
  @Get('facilities/:id')
  findOne(@Param('id') id: string) {
    return this.facilitiesService.findById(id);
  }

  @ApiOperation({ summary: 'Get a facility\'s capability configuration' })
  @Get('facilities/:id/configuration')
  getConfiguration(@Param('id') id: string) {
    return this.facilitiesService.getConfiguration(id);
  }

  @ApiOperation({ summary: 'Merge-update a facility\'s capability flags (e.g. enable inpatient)' })
  @Patch('facilities/:id/configuration')
  updateConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateFacilityConfigurationDto,
    @ActorId() actorId: string
  ) {
    return this.facilitiesService.updateConfiguration(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Add a service to a facility\'s catalog' })
  @Post('facilities/:id/services')
  createService(
    @Param('id') id: string,
    @Body() dto: CreateFacilityServiceDto,
    @ActorId() actorId: string
  ) {
    return this.facilitiesService.createService(id, dto, actorId);
  }

  @ApiOperation({ summary: "List a facility's service catalog" })
  @Get('facilities/:id/services')
  listServices(@Param('id') id: string) {
    return this.facilitiesService.listServices(id);
  }
}
