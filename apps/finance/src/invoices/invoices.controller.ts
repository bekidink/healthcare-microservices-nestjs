import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard, PermissionGuard, RequirePermissions } from '@healthcare/shared';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtVerifyGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @ApiOperation({
    summary: 'Create an invoice',
    description:
      'Pass encounterId to bill against an in-progress encounter (patient/facility are derived from it over ' +
      'REST), or patientId+facilityId directly for a standalone invoice.',
  })
  @Post()
  create(@Body() dto: CreateInvoiceDto, @ActorId() actorId: string) {
    return this.invoicesService.create(dto, actorId);
  }

  @ApiOperation({ summary: "List a patient's invoices" })
  @Get()
  listByPatient(@Query('patientId') patientId: string) {
    return this.invoicesService.listByPatient(patientId);
  }

  @ApiOperation({ summary: 'Get an invoice with its line items and payments' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  @ApiOperation({ summary: 'Void an open invoice (already-paid or already-void invoices cannot be voided) — requires invoice.void' })
  @Post(':id/void')
  @UseGuards(PermissionGuard)
  @RequirePermissions('invoice.void')
  void(@Param('id') id: string, @ActorId() actorId: string) {
    return this.invoicesService.void(id, actorId);
  }

  @ApiOperation({ summary: 'Record a manual payment against an invoice (cash/card/insurance/mobile_money)' })
  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto, @ActorId() actorId: string) {
    return this.invoicesService.recordPayment(id, dto, actorId);
  }
}
