import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SwitchOrganizationDto {
  @ApiProperty({ description: 'Must be an organization the caller has an active Membership in.' })
  @IsString()
  organizationId!: string;
}
