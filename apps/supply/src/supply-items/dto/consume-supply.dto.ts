import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ConsumeSupplyDto {
  @ApiProperty({ example: 20, description: 'Quantity consumed — must be positive.' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'The originating resource type this consumption is tied to, e.g. "Ward".' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'The originating resource id this consumption is tied to.' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
