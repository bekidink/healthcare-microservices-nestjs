import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAccessGrantDto {
  @ApiProperty({ description: 'Identity-service user id of the caregiver/dependent being granted access.' })
  @IsString()
  granteeUserId!: string;

  @ApiProperty({ example: 'caregiver' })
  @IsString()
  relationship!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
