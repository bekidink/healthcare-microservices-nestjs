import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MergeCasesService } from './merge-cases.service';
import { OpenMergeCaseDto } from './dto/open-merge-case.dto';
import { ConfirmMergeCaseDto } from './dto/confirm-merge-case.dto';
import { RejectMergeCaseDto } from './dto/reject-merge-case.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('merge-cases')
@Controller('merge-cases')
export class MergeCasesController {
  constructor(private readonly mergeCasesService: MergeCasesService) {}

  @ApiOperation({ summary: 'Open a duplicate-review case for two patients (manual flag, not a match-search result)' })
  @Post()
  open(@Body() dto: OpenMergeCaseDto, @ActorId() actorId: string) {
    return this.mergeCasesService.openOrGetExisting({
      patientAId: dto.patientAId,
      patientBId: dto.patientBId,
      matchScore: 0,
      matchReason: { source: 'manual' },
      actorId,
    });
  }

  @ApiOperation({ summary: 'Get a merge case' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mergeCasesService.findById(id);
  }

  @ApiOperation({ summary: 'Human-confirm two patients are duplicates and merge them (never automatic)' })
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmMergeCaseDto, @ActorId() actorId: string) {
    return this.mergeCasesService.confirm(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Human-reject a candidate match — these are not duplicates' })
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectMergeCaseDto, @ActorId() actorId: string) {
    return this.mergeCasesService.reject(id, dto, actorId);
  }
}
