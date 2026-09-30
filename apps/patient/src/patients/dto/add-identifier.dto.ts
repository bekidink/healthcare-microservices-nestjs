import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const IDENTIFIER_TYPES = ['facility_mrn', 'national_id', 'insurance_id', 'phone', 'passport'] as const;

export class AddIdentifierDto {
  @ApiProperty({ enum: IDENTIFIER_TYPES })
  @IsIn(IDENTIFIER_TYPES)
  type!: (typeof IDENTIFIER_TYPES)[number];

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional({ description: 'Facility/organization id that issued this identifier, if applicable.' })
  @IsOptional()
  @IsString()
  issuingContext?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
