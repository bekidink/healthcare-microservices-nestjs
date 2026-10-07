import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ReceiveStockDto {
  @ApiProperty({ example: 100, description: 'Quantity received — must be positive.' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'PO #4471 from MedSupply Co.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
