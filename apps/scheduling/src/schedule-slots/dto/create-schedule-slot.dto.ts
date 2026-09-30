import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateScheduleSlotDto {
  @ApiProperty({ description: 'Identity-service provider id.' })
  @IsString()
  providerId!: string;

  @ApiProperty({ description: 'Facility-service facility id.' })
  @IsString()
  facilityId!: string;

  @ApiPropertyOptional({ description: 'Facility-service department id.' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: '2026-10-06' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '09:30' })
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm' })
  endTime!: string;
}
