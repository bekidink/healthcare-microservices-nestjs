import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class CreateInvoiceLineItemDto {
  @ApiProperty({ example: 'Outpatient consultation fee' })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiProperty({ example: 250.0 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ description: 'The originating resource type in another service, e.g. "LabOrder".' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'The originating resource id in another service.' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({
    description:
      'Clinical-service encounter id. When given, patientId/facilityId are derived from that encounter ' +
      '(it must already be in_progress or completed) rather than taken from this body.',
  })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone invoice with no encounterId.' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Required for a standalone invoice with no encounterId.' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceLineItemDto], description: 'At least one line item must be billed.' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  @ArrayMinSize(1)
  items!: CreateInvoiceLineItemDto[];
}
