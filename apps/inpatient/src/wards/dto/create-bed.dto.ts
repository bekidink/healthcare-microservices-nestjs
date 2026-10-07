import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateBedDto {
  @ApiProperty({ example: '12A', description: 'Unique within the ward.' })
  @IsString()
  @MinLength(1)
  bedNumber!: string;
}
