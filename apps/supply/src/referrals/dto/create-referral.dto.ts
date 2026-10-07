import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReferralDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'Identity-service user id of the referring provider.' })
  @IsString()
  fromProviderId!: string;

  @ApiPropertyOptional({ description: 'Facility-service facility id being referred to. At least one of toFacilityId/toProviderId is required.' })
  @IsOptional()
  @IsString()
  toFacilityId?: string;

  @ApiPropertyOptional({ description: 'Identity-service user id of the provider being referred to. At least one of toFacilityId/toProviderId is required.' })
  @IsOptional()
  @IsString()
  toProviderId?: string;

  @ApiProperty({ example: 'Suspected fracture — needs orthopedic evaluation.' })
  @IsString()
  @MinLength(2)
  reason!: string;
}
