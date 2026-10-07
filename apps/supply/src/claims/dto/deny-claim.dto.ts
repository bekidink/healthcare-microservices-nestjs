import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DenyClaimDto {
  @ApiProperty({ example: 'Policy had lapsed as of the service date.' })
  @IsString()
  @MinLength(2)
  decisionNotes!: string;
}
