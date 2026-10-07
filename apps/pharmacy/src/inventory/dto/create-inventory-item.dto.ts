import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiProperty({ example: '313782', description: 'RxNorm code' })
  @IsString()
  medicationCode!: string;

  @ApiProperty({ example: 'Amoxicillin' })
  @IsString()
  @MinLength(2)
  medicationName!: string;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
