import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TransferAdmissionDto {
  @ApiProperty({ description: 'Destination bed id — must currently be "available".' })
  @IsString()
  toBedId!: string;

  @ApiProperty({ example: 'ICU step-down' })
  @IsString()
  reason!: string;
}
