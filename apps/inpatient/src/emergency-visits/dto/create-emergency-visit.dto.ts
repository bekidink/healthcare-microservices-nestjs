import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateEmergencyVisitDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiProperty({ example: 'Chest pain, shortness of breath' })
  @IsString()
  @MinLength(2)
  chiefComplaint!: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: '1 = most critical, 5 = least critical.' })
  @IsInt()
  @Min(1)
  @Max(5)
  triageLevel!: number;
}
