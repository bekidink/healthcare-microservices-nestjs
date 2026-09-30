import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GenerateSlotsDto {
  @ApiProperty({ description: "Facility-service department id — that department's ProviderSchedule entries are expanded." })
  @IsString()
  departmentId!: string;

  @ApiProperty({ description: 'Identity-service provider id — must have a ProviderSchedule in this department.' })
  @IsString()
  providerId!: string;

  @ApiProperty({ example: '2026-10-06' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-10-10' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ default: 30, description: 'Length of each generated bookable slot within the recurring window.' })
  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMins?: number;
}
