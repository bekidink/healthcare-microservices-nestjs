import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const CHANNELS = ['sms', 'email', 'push'] as const;

export class CreateNotificationDto {
  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: (typeof CHANNELS)[number];

  @ApiProperty({
    description:
      'Opaque recipient identifier. No real contact-address resolution (phone number / email inbox) exists ' +
      'in this codebase yet — see NotificationsService and ReminderPollerService doc comments.',
  })
  @IsString()
  recipientId!: string;

  @ApiProperty({ example: 'appointment_reminder' })
  @IsString()
  templateCode!: string;

  @ApiPropertyOptional({ description: 'Template interpolation data, stored as-is.' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
