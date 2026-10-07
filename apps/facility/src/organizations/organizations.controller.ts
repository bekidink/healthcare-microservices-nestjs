import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermissions } from '@healthcare/shared';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({
    summary: 'Register a new top-level organization (hospital, clinic, pharmacy chain, ...)',
    description:
      'Requires organization.manage. In practice this gates to platform super admins (`*`) — a brand-new ' +
      'organization has no Membership yet for anyone to hold a scoped admin role in, so there is no org-scoped ' +
      'way to satisfy this for a truly new organization. See FacilitiesController.create for the equivalent ' +
      "action under an organization you're already an admin of.",
  })
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('organization.manage')
  create(@Body() dto: CreateOrganizationDto, @ActorId() actorId: string) {
    return this.organizationsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get an organization and its facilities' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }
}
