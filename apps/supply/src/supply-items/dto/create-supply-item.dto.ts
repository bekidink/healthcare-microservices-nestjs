import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateSupplyItemDto {
  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiProperty({ example: 'GLV-NITRILE-M', description: "Facility-local supply catalog code." })
  @IsString()
  itemCode!: string;

  @ApiProperty({ example: 'Nitrile gloves (medium)' })
  @IsString()
  @MinLength(2)
  itemName!: string;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
