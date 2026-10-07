import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const PROBLEM_STATUSES = ['active', 'chronic'] as const;

export class CreateProblemDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({ example: 'I10', description: 'ICD-10 code, if known.' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Essential (primary) hypertension' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional({ enum: PROBLEM_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(PROBLEM_STATUSES)
  status?: (typeof PROBLEM_STATUSES)[number];

  @ApiPropertyOptional({ example: '2024-03-01' })
  @IsOptional()
  @IsDateString()
  onsetDate?: string;
}
