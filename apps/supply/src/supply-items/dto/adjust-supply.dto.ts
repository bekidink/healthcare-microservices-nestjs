import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, MinLength, NotEquals } from 'class-validator';

const ADJUSTMENT_TYPES = ['adjustment', 'waste'] as const;

export class AdjustSupplyDto {
  @ApiProperty({
    example: -5,
    description: 'Positive to add stock (e.g. correcting an undercount), negative to remove it (e.g. breakage).',
  })
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @ApiProperty({ enum: ADJUSTMENT_TYPES, default: 'adjustment' })
  @IsIn(ADJUSTMENT_TYPES)
  movementType!: (typeof ADJUSTMENT_TYPES)[number];

  @ApiProperty({ example: 'Physical count correction after monthly audit' })
  @IsString()
  @MinLength(2)
  reason!: string;
}
