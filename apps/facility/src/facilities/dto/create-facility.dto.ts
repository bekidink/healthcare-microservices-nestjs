import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const FACILITY_TYPES = ['hospital', 'clinic', 'pharmacy', 'diagnostic_center'] as const;

export class CreateFacilityDto {
  @ApiProperty({ example: 'Black Lion Hospital — Main Campus' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: FACILITY_TYPES })
  @IsIn(FACILITY_TYPES)
  type!: (typeof FACILITY_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}
