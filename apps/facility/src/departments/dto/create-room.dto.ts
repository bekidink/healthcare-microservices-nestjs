import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

const ROOM_TYPES = ['consultation', 'ward', 'bed_bay', 'theatre', 'lab_bench', 'imaging_suite'] as const;

export class CreateRoomDto {
  @ApiProperty({ example: 'Consult Room 3' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'IM-C3' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: ROOM_TYPES })
  @IsIn(ROOM_TYPES)
  type!: (typeof ROOM_TYPES)[number];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
