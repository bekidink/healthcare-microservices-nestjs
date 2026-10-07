import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiagnosesService } from './diagnoses.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('diagnoses')
@Controller()
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  @ApiOperation({ summary: 'Record a diagnosis for an encounter' })
  @Post('encounters/:encounterId/diagnoses')
  create(@Param('encounterId') encounterId: string, @Body() dto: CreateDiagnosisDto, @ActorId() actorId: string) {
    return this.diagnosesService.create(encounterId, dto, actorId);
  }

  @ApiOperation({ summary: "List an encounter's diagnoses" })
  @Get('encounters/:encounterId/diagnoses')
  list(@Param('encounterId') encounterId: string) {
    return this.diagnosesService.list(encounterId);
  }
}
