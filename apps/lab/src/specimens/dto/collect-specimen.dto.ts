import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const SPECIMEN_TYPES = ['blood', 'urine', 'swab', 'other'] as const;

export class CollectSpecimenDto {
  @ApiProperty({ enum: SPECIMEN_TYPES })
  @IsIn(SPECIMEN_TYPES)
  specimenType!: (typeof SPECIMEN_TYPES)[number];
}
