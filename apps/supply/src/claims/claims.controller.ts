import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ApproveClaimDto } from './dto/approve-claim.dto';
import { DenyClaimDto } from './dto/deny-claim.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('claims')
@Controller('claims')
@UseGuards(JwtVerifyGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @ApiOperation({ summary: 'Submit an insurance claim against a policy (status starts "submitted")' })
  @Post()
  create(@Body() dto: CreateClaimDto, @ActorId() actorId: string) {
    return this.claimsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get a claim' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.claimsService.findById(id);
  }

  @ApiOperation({ summary: "List a policy's claims" })
  @Get()
  listByPolicy(@Query('policyId') policyId: string) {
    return this.claimsService.listByPolicy(policyId);
  }

  @ApiOperation({ summary: 'Approve a submitted claim' })
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveClaimDto, @ActorId() actorId: string) {
    return this.claimsService.approve(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Deny a submitted claim (decisionNotes is required)' })
  @Post(':id/deny')
  deny(@Param('id') id: string, @Body() dto: DenyClaimDto, @ActorId() actorId: string) {
    return this.claimsService.deny(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Mark an approved claim as paid' })
  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @ActorId() actorId: string) {
    return this.claimsService.markPaid(id, actorId);
  }
}
