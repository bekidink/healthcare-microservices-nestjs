import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { AiToolsService } from './ai-tools.service';
import { LookupPatientDto } from './dto/lookup-patient.dto';
import { SummarizeEncounterDto } from './dto/summarize-encounter.dto';
import { ActorId } from '../common/actor.decorator';

/**
 * A fixed, small set of "AI tools" — each one a controlled, read-only proxy
 * onto another domain service's real REST API (Patient, Clinical), never a
 * raw query against another service's database and never a write of any
 * kind. This controller exists to demonstrate the PRD's core rule for this
 * milestone: "AI uses controlled tools/domain services only — never direct
 * production DB mutation." There is no mutating endpoint anywhere in this
 * controller, and there never will be — every "tool" call is logged as an
 * AiToolInvocation row (success or failure) for full auditability of what
 * the "AI" actually did.
 */
@ApiTags('ai-tools')
@Controller('ai')
@UseGuards(JwtVerifyGuard)
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @ApiOperation({ summary: "Look up a patient by id (read-only proxy onto Patient's GET /patients/:id)" })
  @Post('tools/lookup-patient')
  lookupPatient(@Body() dto: LookupPatientDto, @ActorId() actorId: string) {
    return this.aiToolsService.lookupPatient(dto.patientId, actorId);
  }

  @ApiOperation({
    summary: "Summarize an encounter (read-only proxy onto Clinical's GET /encounters/:id)",
    description: 'Builds a small read-only summary purely from that response — never mutates anything.',
  })
  @Post('tools/summarize-encounter')
  summarizeEncounter(@Body() dto: SummarizeEncounterDto, @ActorId() actorId: string) {
    return this.aiToolsService.summarizeEncounter(dto.encounterId, actorId);
  }

  @ApiOperation({ summary: 'List the AI tool invocation log, for auditability of what the "AI" actually did' })
  @Get('tool-invocations')
  listInvocations(@Query('toolName') toolName?: string, @Query('invokedBy') invokedBy?: string) {
    return this.aiToolsService.listInvocations(toolName, invokedBy);
  }
}
