import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'doctor@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    description:
      'Required only if this user has more than one active organization membership — picks which one becomes ' +
      'the token\'s activeOrganizationId. A single-membership user may omit this; it is auto-selected.',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
