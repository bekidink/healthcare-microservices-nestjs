import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectSpecimenDto {
  @ApiProperty({ example: 'Hemolyzed sample' })
  @IsString()
  @MinLength(2)
  reason!: string;
}
