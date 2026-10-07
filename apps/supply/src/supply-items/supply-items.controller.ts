import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { SupplyItemsService } from './supply-items.service';
import { CreateSupplyItemDto } from './dto/create-supply-item.dto';
import { ReceiveSupplyDto } from './dto/receive-supply.dto';
import { AdjustSupplyDto } from './dto/adjust-supply.dto';
import { ConsumeSupplyDto } from './dto/consume-supply.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('supply-items')
@Controller('supply-items')
@UseGuards(JwtVerifyGuard)
export class SupplyItemsController {
  constructor(private readonly supplyItemsService: SupplyItemsService) {}

  @ApiOperation({ summary: "Register a supply item in a facility's stock catalog (starts at 0 on hand)" })
  @Post()
  create(@Body() dto: CreateSupplyItemDto, @ActorId() actorId: string) {
    return this.supplyItemsService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a facility's supply catalog" })
  @Get()
  listByFacility(@Query('facilityId') facilityId: string) {
    return this.supplyItemsService.listByFacility(facilityId);
  }

  @ApiOperation({ summary: 'Get a supply item with its full ledger history' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplyItemsService.findById(id);
  }

  @ApiOperation({ summary: 'Receive stock (e.g. a new shipment) — creates a ledger entry, never edits quantityOnHand directly' })
  @Post(':id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceiveSupplyDto, @ActorId() actorId: string) {
    return this.supplyItemsService.receive(id, dto, actorId);
  }

  @ApiOperation({
    summary: 'Adjust stock up or down with a reason (count correction, waste/breakage/expiry)',
    description: 'Also creates a ledger entry — there is no endpoint anywhere that sets quantityOnHand directly.',
  })
  @Post(':id/adjust')
  adjust(@Param('id') id: string, @Body() dto: AdjustSupplyDto, @ActorId() actorId: string) {
    return this.supplyItemsService.adjust(id, dto, actorId);
  }

  @ApiOperation({
    summary: 'Record ward-level consumption of a non-prescription supply (gloves, syringes, bandages)',
    description: 'Distinct from a Pharmacy dispense — also creates a ledger entry in the same transaction.',
  })
  @Post(':id/consume')
  consume(@Param('id') id: string, @Body() dto: ConsumeSupplyDto, @ActorId() actorId: string) {
    return this.supplyItemsService.consume(id, dto, actorId);
  }
}
