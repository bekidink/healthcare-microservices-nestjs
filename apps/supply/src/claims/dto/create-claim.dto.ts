import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateClaimDto {
  @ApiProperty({ description: 'InsurancePolicy id.' })
  @IsString()
  policyId!: string;

  @ApiPropertyOptional({ description: 'Finance-service invoice id, referenced by value only.' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0.01)
  amountClaimed!: number;
}
