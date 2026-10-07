import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ABNORMAL_FLAGS = ['normal', 'low', 'high', 'critical'] as const;

export class CreateLabResultDto {
  @ApiProperty({ example: '138' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'mmol/L' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '135-145' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ enum: ABNORMAL_FLAGS, default: 'normal' })
  @IsOptional()
  @IsIn(ABNORMAL_FLAGS)
  abnormalFlag?: (typeof ABNORMAL_FLAGS)[number];
}
