import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

const DEPARTMENT_TYPES = [
  'outpatient',
  'inpatient',
  'emergency',
  'lab',
  'radiology',
  'pharmacy',
  'theatre',
  'administration',
] as const;

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Internal Medicine' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: DEPARTMENT_TYPES })
  @IsIn(DEPARTMENT_TYPES)
  type!: (typeof DEPARTMENT_TYPES)[number];
}
