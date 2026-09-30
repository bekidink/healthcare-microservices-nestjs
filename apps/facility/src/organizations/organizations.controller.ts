import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Register a new top-level organization (hospital, clinic, pharmacy chain, ...)' })
  @Post()
  create(@Body() dto: CreateOrganizationDto, @ActorId() actorId: string) {
    return this.organizationsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get an organization and its facilities' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }
}
