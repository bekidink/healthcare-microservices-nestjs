import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OpenMergeCaseDto {
  @ApiProperty()
  @IsString()
  patientAId!: string;

  @ApiProperty()
  @IsString()
  patientBId!: string;
}
