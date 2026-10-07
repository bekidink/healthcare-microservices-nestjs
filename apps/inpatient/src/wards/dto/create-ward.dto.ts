import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

const WARD_TYPES = ['general', 'icu', 'maternity', 'pediatric'] as const;

export class CreateWardDto {
  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiProperty({ example: 'Ward 3B' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: WARD_TYPES })
  @IsIn(WARD_TYPES)
  type!: (typeof WARD_TYPES)[number];
}
