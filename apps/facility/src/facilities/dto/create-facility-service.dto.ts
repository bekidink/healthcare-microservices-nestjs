import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFacilityServiceDto {
  @ApiProperty({ example: 'General Consultation' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'GEN_CONSULT' })
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
