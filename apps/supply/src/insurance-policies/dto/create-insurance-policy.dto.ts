import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInsurancePolicyDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiProperty({ example: 'Nyala Insurance S.C.' })
  @IsString()
  @MinLength(2)
  payerName!: string;

  @ApiProperty({ example: 'POL-00019284' })
  @IsString()
  policyNumber!: string;

  @ApiPropertyOptional({ example: 'GRP-442' })
  @IsOptional()
  @IsString()
  groupNumber?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}
