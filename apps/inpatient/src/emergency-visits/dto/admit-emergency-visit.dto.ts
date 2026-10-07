import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AdmitEmergencyVisitDto {
  @ApiProperty()
  @IsString()
  wardId!: string;

  @ApiProperty({ description: 'Must currently be "available".' })
  @IsString()
  bedId!: string;

  @ApiProperty({ description: 'Identity-service user id of the admitting provider.' })
  @IsString()
  admittingProviderId!: string;
}
