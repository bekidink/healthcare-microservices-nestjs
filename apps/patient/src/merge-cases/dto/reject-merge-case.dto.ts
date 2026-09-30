import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectMergeCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
