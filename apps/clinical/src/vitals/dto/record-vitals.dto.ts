import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class RecordVitalsDto {
  @ApiPropertyOptional({ example: 37.0 })
  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @ApiPropertyOptional({ example: 78 })
  @IsOptional()
  @IsInt()
  heartRateBpm?: number;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @IsInt()
  respiratoryRateBpm?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ example: 98, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  spo2Percent?: number;

  @ApiPropertyOptional({ example: 70.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 172 })
  @IsOptional()
  @IsNumber()
  heightCm?: number;
}
