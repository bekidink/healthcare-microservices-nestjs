import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString } from 'class-validator';

const CHANNELS = ['sms', 'push', 'email'] as const;

export class CreateReminderDto {
  @ApiProperty()
  @IsString()
  appointmentId!: string;

  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: (typeof CHANNELS)[number];

  @ApiProperty({ example: '2026-10-05T08:00:00.000Z' })
  @IsDateString()
  scheduledFor!: string;
}
