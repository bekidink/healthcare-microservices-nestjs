import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignProviderDto {
  @ApiProperty({ description: 'Identity-service User/ProviderProfile id — referenced by value only.' })
  @IsString()
  providerId!: string;

  @ApiPropertyOptional({ example: 'Attending Physician' })
  @IsOptional()
  @IsString()
  roleTitle?: string;
}
