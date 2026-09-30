import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateProviderScheduleDto {
  @ApiProperty({ description: 'Identity-service User/ProviderProfile id.' })
  @IsString()
  providerId!: string;

  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday .. 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm (facility-local time)' })
  startTime!: string;

  @ApiProperty({ example: '16:00' })
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm (facility-local time)' })
  endTime!: string;
}
