import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SummarizeEncounterDto {
  @ApiProperty({ description: 'Clinical-service encounter id.' })
  @IsString()
  encounterId!: string;
}
