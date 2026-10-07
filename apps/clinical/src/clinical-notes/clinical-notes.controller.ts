import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermissions } from '@healthcare/shared';
import { ClinicalNotesService } from './clinical-notes.service';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('clinical-notes')
@Controller()
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  @ApiOperation({ summary: 'Create a draft clinical note (SOAP/progress/discharge) for an encounter' })
  @Post('encounters/:encounterId/notes')
  create(@Param('encounterId') encounterId: string, @Body() dto: CreateClinicalNoteDto, @ActorId() actorId: string) {
    return this.clinicalNotesService.create(encounterId, dto, actorId);
  }

  @ApiOperation({ summary: "List an encounter's clinical notes" })
  @Get('encounters/:encounterId/notes')
  list(@Param('encounterId') encounterId: string) {
    return this.clinicalNotesService.list(encounterId);
  }

  @ApiOperation({ summary: 'Edit a draft note — fails once the note has been signed' })
  @Patch('notes/:id')
  update(@Param('id') id: string, @Body() dto: CreateClinicalNoteDto) {
    return this.clinicalNotesService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Sign a note, making it permanent',
    description:
      'Once signed, this note can never be edited again — not even by this endpoint or a future one. Requires ' +
      'encounter.sign.',
  })
  @Post('notes/:id/sign')
  @UseGuards(PermissionGuard)
  @RequirePermissions('encounter.sign')
  sign(@Param('id') id: string, @ActorId() actorId: string) {
    return this.clinicalNotesService.sign(id, actorId);
  }
}
