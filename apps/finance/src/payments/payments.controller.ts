import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { PaymentsService } from './payments.service';
import { ProcessPaymentCallbackDto } from './dto/process-payment-callback.dto';
import { ActorId } from '../common/actor.decorator';

// Kept deliberately separate from InvoicesController: this is the external
// payment-gateway webhook surface, not the internal invoice API.
@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtVerifyGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({
    summary: 'Payment gateway webhook callback',
    description:
      'Simulates an external payment gateway notifying us of a settled (or failed) payment attempt. Must be ' +
      'verified (invoice must exist and not already be paid/void) and idempotent (redelivery of the same ' +
      'externalReference is a no-op that returns the already-recorded Payment, never a duplicate).',
  })
  @Post('callback')
  callback(@Body() dto: ProcessPaymentCallbackDto, @ActorId() actorId: string) {
    return this.paymentsService.handleCallback(dto, actorId);
  }
}
