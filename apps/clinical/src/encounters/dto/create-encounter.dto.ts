import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ENCOUNTER_TYPES = ['outpatient_visit', 'inpatient_admission', 'emergency_visit', 'telemedicine'] as const;

export class CreateEncounterDto {
  @ApiPropertyOptional({
    description:
      'Scheduling-service appointment id. When given, patientId/providerId/facilityId/departmentId are derived ' +
      'from that appointment (which must already be checked_in or in_service) rather than taken from this body.',
  })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ description: 'Required for a walk-in encounter with no appointmentId.' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Required for a walk-in encounter with no appointmentId.' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Required for a walk-in encounter with no appointmentId.' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ enum: ENCOUNTER_TYPES })
  @IsIn(ENCOUNTER_TYPES)
  encounterType!: (typeof ENCOUNTER_TYPES)[number];

  @ApiPropertyOptional({ example: 'Follow-up on hypertension management' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;
}
