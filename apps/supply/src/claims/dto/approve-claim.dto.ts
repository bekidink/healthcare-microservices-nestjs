import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
