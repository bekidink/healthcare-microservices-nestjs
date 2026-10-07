import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDispenseDto {
  @ApiProperty({ description: "Facility's InventoryItem id to dispense from." })
  @IsString()
  inventoryItemId!: string;

  @ApiPropertyOptional({
    description: 'Defaults to the full prescribed quantity if omitted (e.g. for a partial fill).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
