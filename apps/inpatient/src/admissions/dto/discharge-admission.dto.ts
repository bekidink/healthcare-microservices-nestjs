import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DischargeAdmissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dischargeNotes?: string;
}
