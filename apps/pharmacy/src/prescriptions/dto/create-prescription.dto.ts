import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class CreatePrescriptionItemDto {
  @ApiProperty({ example: '313782', description: 'RxNorm code' })
  @IsString()
  medicationCode!: string;

  @ApiProperty({ example: 'Amoxicillin' })
  @IsString()
  @MinLength(2)
  medicationName!: string;

  @ApiProperty({ example: '500mg' })
  @IsString()
  dosage!: string;

  @ApiProperty({ example: 'three times daily' })
  @IsString()
  frequency!: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ example: 21 })
  @IsInt()
  @Min(1)
  quantityPrescribed!: number;
}

export class CreatePrescriptionDto {
  @ApiPropertyOptional({
    description:
      'Clinical-service encounter id. When given, patientId/providerId/facilityId are derived from that ' +
      'encounter (it must already be in_progress or completed) rather than taken from this body.',
  })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone prescription with no encounterId.' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone prescription with no encounterId.' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone prescription with no encounterId.' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePrescriptionItemDto], description: 'At least one medication must be prescribed.' })
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  @ArrayMinSize(1)
  items!: CreatePrescriptionItemDto[];
}
