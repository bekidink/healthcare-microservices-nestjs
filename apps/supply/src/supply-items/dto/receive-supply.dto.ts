import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ReceiveSupplyDto {
  @ApiProperty({ example: 500, description: 'Quantity received — must be positive.' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'PO #8821 from MedSupply Co.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
