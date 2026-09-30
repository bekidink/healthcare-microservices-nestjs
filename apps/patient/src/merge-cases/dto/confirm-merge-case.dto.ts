import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmMergeCaseDto {
  @ApiProperty({ description: 'Which of the two patients survives the merge; the other is marked merged into it.' })
  @IsString()
  survivorPatientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
