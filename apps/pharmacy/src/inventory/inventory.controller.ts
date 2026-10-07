import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('inventory')
@Controller('inventory-items')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: "Register a medication in a facility's stock catalog (starts at 0 on hand)" })
  @Post()
  create(@Body() dto: CreateInventoryItemDto, @ActorId() actorId: string) {
    return this.inventoryService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a facility's stock catalog" })
  @Get()
  listByFacility(@Query('facilityId') facilityId: string) {
    return this.inventoryService.listByFacility(facilityId);
  }

  @ApiOperation({ summary: 'Get an inventory item with its full ledger history' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @ApiOperation({ summary: 'Receive stock (e.g. a new shipment) — creates a ledger entry, never edits quantityOnHand directly' })
  @Post(':id/receive')
  receive(@Param('id') id: string, @Body() dto: ReceiveStockDto, @ActorId() actorId: string) {
    return this.inventoryService.receive(id, dto, actorId);
  }

  @ApiOperation({
    summary: 'Adjust stock up or down with a reason (count correction, waste/breakage/expiry)',
    description: 'Also creates a ledger entry — there is no endpoint anywhere that sets quantityOnHand directly.',
  })
  @Post(':id/adjust')
  adjust(@Param('id') id: string, @Body() dto: AdjustStockDto, @ActorId() actorId: string) {
    return this.inventoryService.adjust(id, dto, actorId);
  }
}
