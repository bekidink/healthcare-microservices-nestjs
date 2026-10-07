import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('referrals')
@Controller('referrals')
@UseGuards(JwtVerifyGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @ApiOperation({ summary: 'Create a referral of a patient to another provider and/or facility (status starts "pending")' })
  @Post()
  create(@Body() dto: CreateReferralDto, @ActorId() actorId: string) {
    return this.referralsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get a referral' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.referralsService.findById(id);
  }

  @ApiOperation({ summary: "List a patient's referrals" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.referralsService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Accept a pending referral' })
  @Post(':id/accept')
  accept(@Param('id') id: string, @ActorId() actorId: string) {
    return this.referralsService.accept(id, actorId);
  }

  @ApiOperation({ summary: 'Decline a pending referral' })
  @Post(':id/decline')
  decline(@Param('id') id: string, @ActorId() actorId: string) {
    return this.referralsService.decline(id, actorId);
  }

  @ApiOperation({ summary: 'Complete an accepted referral' })
  @Post(':id/complete')
  complete(@Param('id') id: string, @ActorId() actorId: string) {
    return this.referralsService.complete(id, actorId);
  }
}
