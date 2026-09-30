import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AddIdentifierDto } from './dto/add-identifier.dto';
import { AddContactDto } from './dto/add-contact.dto';
import { RecordConsentDto } from './dto/record-consent.dto';
import { CreateAccessGrantDto } from './dto/create-access-grant.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // NOTE: this static route MUST be declared before the `:id` route below —
  // Nest/Express match routes in registration order, so a `GET /patients/:id`
  // registered first would swallow `GET /patients/search` as id="search".
  @ApiOperation({ summary: 'Search/match candidate patients (read-only — never merges or creates anything)' })
  @Get('search')
  search(
    @Query('firstName') firstName: string,
    @Query('lastName') lastName: string,
    @Query('dateOfBirth') dateOfBirth: string,
    @Query('nationalId') nationalId?: string,
    @Query('phone') phone?: string
  ) {
    return this.patientsService.search({ firstName, lastName, dateOfBirth, nationalId, phone });
  }

  @ApiOperation({
    summary: 'Register a new patient',
    description:
      'Always creates the patient (never blocks on possible duplicates). Runs MPI matching against existing ' +
      'patients first; high-confidence matches auto-open a MergeCase for human review, and all candidates found ' +
      '(regardless of score) are returned in the response as `possibleDuplicates`.',
  })
  @Post()
  create(@Body() dto: CreatePatientDto, @ActorId() actorId: string) {
    return this.patientsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get a patient with identifiers and contacts' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }

  @ApiOperation({ summary: 'Attach an identifier (MRN, national ID, insurance ID, ...) to a patient' })
  @Post(':id/identifiers')
  addIdentifier(@Param('id') id: string, @Body() dto: AddIdentifierDto, @ActorId() actorId: string) {
    return this.patientsService.addIdentifier(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Attach a contact (phone/email/address) to a patient' })
  @Post(':id/contacts')
  addContact(@Param('id') id: string, @Body() dto: AddContactDto, @ActorId() actorId: string) {
    return this.patientsService.addContact(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Record a consent for a patient' })
  @Post(':id/consent')
  recordConsent(@Param('id') id: string, @Body() dto: RecordConsentDto, @ActorId() actorId: string) {
    return this.patientsService.recordConsent(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Withdraw a previously recorded consent' })
  @Post(':id/consent/:consentId/withdraw')
  withdrawConsent(@Param('id') id: string, @Param('consentId') consentId: string, @ActorId() actorId: string) {
    return this.patientsService.withdrawConsent(id, consentId, actorId);
  }

  @ApiOperation({ summary: 'Grant a caregiver/dependent explicit access to this patient' })
  @Post(':id/access-grants')
  createAccessGrant(@Param('id') id: string, @Body() dto: CreateAccessGrantDto, @ActorId() actorId: string) {
    return this.patientsService.createAccessGrant(id, dto, actorId);
  }

  @ApiOperation({ summary: 'Revoke a previously granted caregiver/dependent access' })
  @Post(':id/access-grants/:grantId/revoke')
  revokeAccessGrant(@Param('id') id: string, @Param('grantId') grantId: string, @ActorId() actorId: string) {
    return this.patientsService.revokeAccessGrant(id, grantId, actorId);
  }
}
