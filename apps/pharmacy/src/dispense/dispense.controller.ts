import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DispenseService } from './dispense.service';
import { CreateDispenseDto } from './dto/create-dispense.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('dispense')
@Controller()
export class DispenseController {
  constructor(private readonly dispenseService: DispenseService) {}

  @ApiOperation({
    summary: 'Dispense a prescribed medication from a facility\'s inventory',
    description:
      'Atomically marks the prescription item dispensed and creates the StockLedgerEntry that decrements ' +
      'inventory — both commit together or neither does. Rejects a medication mismatch between what was ' +
      'prescribed and the inventory item being dispensed from, and rejects insufficient stock.',
  })
  @Post('prescription-items/:prescriptionItemId/dispense')
  create(
    @Param('prescriptionItemId') prescriptionItemId: string,
    @Body() dto: CreateDispenseDto,
    @ActorId() actorId: string
  ) {
    return this.dispenseService.create(prescriptionItemId, dto, actorId);
  }
}
