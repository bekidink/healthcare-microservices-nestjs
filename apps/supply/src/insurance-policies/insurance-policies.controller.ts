import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { InsurancePoliciesService } from './insurance-policies.service';
import { CreateInsurancePolicyDto } from './dto/create-insurance-policy.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('insurance-policies')
@Controller('insurance-policies')
@UseGuards(JwtVerifyGuard)
export class InsurancePoliciesController {
  constructor(private readonly insurancePoliciesService: InsurancePoliciesService) {}

  @ApiOperation({ summary: "Register a patient's insurance policy" })
  @Post()
  create(@Body() dto: CreateInsurancePolicyDto, @ActorId() actorId: string) {
    return this.insurancePoliciesService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's insurance policies" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.insurancePoliciesService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get an insurance policy with its claims' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insurancePoliciesService.findById(id);
  }
}
