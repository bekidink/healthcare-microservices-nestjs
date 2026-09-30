import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateFacilityConfigurationDto {
  @ApiProperty({
    description: 'Capability flags to merge into the existing configuration (only listed keys are changed).',
    example: { inpatient: true, theatre: false },
    type: 'object',
    additionalProperties: { type: 'boolean' },
  })
  @IsObject()
  capabilities!: Record<string, boolean>;
}
