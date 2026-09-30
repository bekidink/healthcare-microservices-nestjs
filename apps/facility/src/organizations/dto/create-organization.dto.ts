import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

const ORG_TYPES = ['healthcare_network', 'hospital', 'clinic', 'pharmacy_chain', 'diagnostic_center'] as const;

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Black Lion General Hospital PLC' })
  @IsString()
  @MinLength(2)
  legalName!: string;

  @ApiProperty({ example: 'Black Lion Hospital' })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ enum: ORG_TYPES })
  @IsIn(ORG_TYPES)
  type!: (typeof ORG_TYPES)[number];
}
