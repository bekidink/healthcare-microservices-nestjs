import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { WardsService } from './wards.service';
import { CreateWardDto } from './dto/create-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('wards')
@UseGuards(JwtVerifyGuard)
@Controller()
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  @ApiOperation({ summary: 'Create a ward within a facility' })
  @Post('wards')
  createWard(@Body() dto: CreateWardDto, @ActorId() actorId: string) {
    return this.wardsService.createWard(dto, actorId);
  }

  @ApiOperation({ summary: 'List wards, optionally filtered by facility' })
  @Get('wards')
  listWards(@Query('facilityId') facilityId?: string) {
    return this.wardsService.listWards(facilityId);
  }

  @ApiOperation({ summary: 'Add a bed to a ward' })
  @Post('wards/:wardId/beds')
  createBed(@Param('wardId') wardId: string, @Body() dto: CreateBedDto, @ActorId() actorId: string) {
    return this.wardsService.createBed(wardId, dto, actorId);
  }

  @ApiOperation({ summary: "List a ward's beds" })
  @Get('wards/:wardId/beds')
  listBeds(@Param('wardId') wardId: string) {
    return this.wardsService.listBeds(wardId);
  }

  @ApiOperation({ summary: 'Get a bed' })
  @Get('beds/:id')
  findBed(@Param('id') id: string) {
    return this.wardsService.findBedById(id);
  }

  @ApiOperation({ summary: 'Mark a bed available again after cleaning (cleaning -> available only)' })
  @Post('beds/:id/mark-available')
  markAvailable(@Param('id') id: string, @ActorId() actorId: string) {
    return this.wardsService.markAvailable(id, actorId);
  }
}
