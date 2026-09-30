import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const CONTACT_TYPES = ['phone', 'email', 'address'] as const;

export class AddContactDto {
  @ApiProperty({ enum: CONTACT_TYPES })
  @IsIn(CONTACT_TYPES)
  type!: (typeof CONTACT_TYPES)[number];

  @ApiProperty()
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
