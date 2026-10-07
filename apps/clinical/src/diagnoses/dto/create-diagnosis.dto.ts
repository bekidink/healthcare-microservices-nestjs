import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const DIAGNOSIS_TYPES = ['primary', 'secondary'] as const;

export class CreateDiagnosisDto {
  @ApiProperty({ example: 'J06.9', description: 'ICD-10 code' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Acute upper respiratory infection, unspecified' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional({ enum: DIAGNOSIS_TYPES, default: 'secondary' })
  @IsOptional()
  @IsIn(DIAGNOSIS_TYPES)
  type?: (typeof DIAGNOSIS_TYPES)[number];
}
