import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const NOTE_TYPES = ['soap', 'progress', 'discharge'] as const;

export class CreateClinicalNoteDto {
  @ApiProperty({ enum: NOTE_TYPES, default: 'soap' })
  @IsOptional()
  @IsIn(NOTE_TYPES)
  noteType?: (typeof NOTE_TYPES)[number];

  @ApiPropertyOptional({ example: 'Patient reports intermittent headaches for 2 weeks.' })
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional({ example: 'BP 138/88, alert and oriented x3.' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ example: 'Tension headache, likely stress-related.' })
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional({ example: 'Recommend hydration, follow-up in 2 weeks if persistent.' })
  @IsOptional()
  @IsString()
  plan?: string;
}
