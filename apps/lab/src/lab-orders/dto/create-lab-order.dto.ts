import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

const PRIORITIES = ['routine', 'urgent', 'stat'] as const;

export class CreateLabOrderItemDto {
  @ApiProperty({ example: '2951-2', description: 'LOINC code' })
  @IsString()
  testCode!: string;

  @ApiProperty({ example: 'Sodium, Serum' })
  @IsString()
  @MinLength(2)
  testName!: string;
}

export class CreateLabOrderDto {
  @ApiPropertyOptional({
    description:
      'Clinical-service encounter id. When given, patientId/providerId/facilityId are derived from that ' +
      'encounter (it must already be in_progress or completed) rather than taken from this body.',
  })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone order with no encounterId.' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone order with no encounterId.' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone order with no encounterId.' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ enum: PRIORITIES, default: 'routine' })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateLabOrderItemDto], description: 'At least one test must be ordered.' })
  @ValidateNested({ each: true })
  @Type(() => CreateLabOrderItemDto)
  @ArrayMinSize(1)
  items!: CreateLabOrderItemDto[];
}
