import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAdmissionDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({
    description:
      'Clinical-service encounter id, when this admission follows one (e.g. post-surgical). Fetched over ' +
      'REST purely for validation/enrichment — no particular encounter status is required.',
  })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty()
  @IsString()
  wardId!: string;

  @ApiProperty({ description: 'Must currently be "available".' })
  @IsString()
  bedId!: string;

  @ApiProperty({ description: 'Identity-service user id of the admitting provider.' })
  @IsString()
  admittingProviderId!: string;
}
