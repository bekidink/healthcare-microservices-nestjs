import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LookupPatientDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;
}
