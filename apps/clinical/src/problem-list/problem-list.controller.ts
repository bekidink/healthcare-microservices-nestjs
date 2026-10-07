import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProblemListService } from './problem-list.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('problem-list')
@Controller('problems')
export class ProblemListController {
  constructor(private readonly problemListService: ProblemListService) {}

  @ApiOperation({ summary: "Add an entry to a patient's standing problem list" })
  @Post()
  create(@Body() dto: CreateProblemDto, @ActorId() actorId: string) {
    return this.problemListService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's problem list, across every encounter" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.problemListService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Mark a problem resolved' })
  @Post(':id/resolve')
  resolve(@Param('id') id: string, @ActorId() actorId: string) {
    return this.problemListService.resolve(id, actorId);
  }
}
