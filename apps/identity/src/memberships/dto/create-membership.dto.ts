import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMembershipDto {
  @ApiProperty({ description: 'The user being granted a role in this organization.' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Facility-service organization id — stored as a plain value, never a real FK.' })
  @IsString()
  organizationId!: string;

  @ApiPropertyOptional({ description: 'Optionally scope the membership to one facility within the organization.' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ example: 'clinician', description: 'Must match an existing Role.name (see the seeded roles).' })
  @IsString()
  roleName!: string;
}
