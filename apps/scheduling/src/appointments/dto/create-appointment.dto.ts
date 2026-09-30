import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Patient-service patient id.' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'An open ScheduleSlot id — booking it atomically marks it booked.' })
  @IsString()
  slotId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
