import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAppointmentTypeDto {
  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiProperty({ example: 'General Consultation' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'GEN_CONSULT' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  defaultDurationMins?: number;
}
