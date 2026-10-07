import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, Min } from 'class-validator';

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'mobile_money'] as const;

export class RecordPaymentDto {
  @ApiProperty({ example: 100.0 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];
}
