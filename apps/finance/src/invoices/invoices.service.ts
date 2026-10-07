import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientService } from '../clinical-client/clinical-client.service';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { RecordPaymentDto } from './dto/record-payment.dto';

// An invoice should be tied to care that's actually happening — not a
// booking that hasn't started yet. Mirrors Lab's ENCOUNTER_STATUSES_ALLOWING_ORDER.
const ENCOUNTER_STATUSES_ALLOWING_INVOICE = ['in_progress', 'completed'];

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  async create(dto: CreateInvoiceDto, actorId: string) {
    let patientId = dto.patientId;
    let facilityId = dto.facilityId;

    if (dto.encounterId) {
      const encounter = await this.clinicalClient.getEncounter(dto.encounterId);
      if (!encounter) {
        throw new NotFoundException(`Encounter ${dto.encounterId} not found in the Clinical service.`);
      }
      if (!ENCOUNTER_STATUSES_ALLOWING_INVOICE.includes(encounter.status)) {
        throw new BadRequestException(
          `Encounter ${dto.encounterId} is "${encounter.status}" — it must be in_progress (or completed) to bill against it.`
        );
      }
      patientId = encounter.patientId;
      facilityId = encounter.facilityId;
    }

    if (!patientId || !facilityId) {
      throw new BadRequestException(
        'Either encounterId, or patientId + facilityId directly (for a standalone invoice), are required.'
      );
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          encounterId: dto.encounterId,
          patientId,
          facilityId,
          notes: dto.notes,
          totalAmount,
          items: {
            create: dto.items.map((item) => ({
              description: item.description,
              amount: item.amount,
              referenceType: item.referenceType,
              referenceId: item.referenceId,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'invoice.created',
        resourceType: 'Invoice',
        resourceId: invoice.id,
        metadata: { patientId, encounterId: dto.encounterId, totalAmount },
      });
      await this.auditOutbox.publishEvent(tx, 'InvoiceCreated', {
        invoiceId: invoice.id,
        patientId,
        facilityId,
        totalAmount,
      });

      return invoice;
    });
  }

  async findById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: { orderBy: { processedAt: 'desc' } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async listByPatient(patientId: string) {
    return this.prisma.invoice.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
  }

  async void(id: string, actorId: string) {
    const invoice = await this.findById(id);
    if (invoice.status !== 'open') {
      throw new BadRequestException(`Invoice is "${invoice.status}" — only an open invoice can be voided.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({ where: { id }, data: { status: 'void' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: invoice.facilityId,
        action: 'invoice.voided',
        resourceType: 'Invoice',
        resourceId: id,
      });

      return updated;
    });
  }

  async recordPayment(id: string, dto: RecordPaymentDto, actorId: string) {
    const invoice = await this.findById(id);
    if (invoice.status === 'void') {
      throw new BadRequestException('Invoice is void — payments cannot be recorded against it.');
    }
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid.');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: dto.amount,
          method: dto.method,
          status: 'completed',
        },
      });

      const completedPayments = await tx.payment.findMany({
        where: { invoiceId: id, status: 'completed' },
      });
      const paidSoFar = completedPayments.reduce((sum, p) => sum + p.amount, 0);

      let invoiceStatus = invoice.status;
      if (paidSoFar >= invoice.totalAmount) {
        await tx.invoice.update({ where: { id }, data: { status: 'paid' } });
        invoiceStatus = 'paid';
      }

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: invoice.facilityId,
        action: 'payment.recorded',
        resourceType: 'Invoice',
        resourceId: id,
        metadata: { paymentId: payment.id, amount: dto.amount, method: dto.method, invoiceStatus },
      });
      await this.auditOutbox.publishEvent(tx, 'PaymentRecorded', {
        invoiceId: id,
        paymentId: payment.id,
        amount: dto.amount,
        method: dto.method,
        invoiceStatus,
      });

      return payment;
    });
  }
}
