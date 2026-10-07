import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Min } from 'class-validator';

const CALLBACK_STATUSES = ['completed', 'failed'] as const;

/**
 * The payload shape a payment gateway's webhook would POST to us. Modeled
 * after how real gateways (Stripe, Telebirr, Chapa, etc.) report an
 * out-of-band payment attempt: their own reference id, the amount/method
 * they processed, and whether it succeeded.
 */
export class ProcessPaymentCallbackDto {
  @ApiProperty({ description: 'The Finance invoice this callback settles.' })
  @IsString()
  invoiceId!: string;

  @ApiProperty({ example: 100.0 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'mobile_money' })
  @IsString()
  method!: string;

  @ApiProperty({
    description:
      'The payment gateway\'s own idempotency key for this attempt. Must be unique per attempt — this is ' +
      'what makes the callback endpoint idempotent against redelivery of the same webhook.',
  })
  @IsString()
  externalReference!: string;

  @ApiProperty({ enum: CALLBACK_STATUSES })
  @IsIn(CALLBACK_STATUSES)
  status!: (typeof CALLBACK_STATUSES)[number];
}
