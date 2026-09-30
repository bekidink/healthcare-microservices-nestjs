import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class RecordConsentDto {
  @ApiProperty({ example: 'treatment' })
  @IsString()
  purpose!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { dataTypes: ['clinical_notes', 'lab_results'] } })
  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
