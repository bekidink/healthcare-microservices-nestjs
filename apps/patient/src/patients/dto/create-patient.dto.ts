import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Abebe' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Kebede' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: '1990-05-14' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Optional national ID, checked against existing patients for duplicates before creation.' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Optional phone, checked against existing patients for duplicates before creation.' })
  @IsOptional()
  @IsString()
  phone?: string;
}
