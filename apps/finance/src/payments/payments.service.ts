import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { ProcessPaymentCallbackDto } from './dto/process-payment-callback.dto';

// Prisma's error code for a unique-constraint violation — see the race-safety
// comment on handleCallback below.
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  /**
   * Simulates the webhook a payment gateway (Stripe/Telebirr/Chapa/etc.)
   * would POST to us once it has settled (or failed) a payment attempt.
   *
   * Core PRD rule this method exists to satisfy: "Payment callbacks must be
   * verified and idempotent." Both halves matter independently:
   *
   * VERIFIED — a callback is only ever trusted to affect an Invoice that:
   *   (a) actually exists (404 otherwise), and
   *   (b) is still in a state a payment can affect, i.e. not already
   *       "paid" or "void" (400 otherwise). A stale or duplicate callback
   *       for an invoice that's already settled must never reopen it or
   *       re-apply any side effect — settlement is a one-way door.
   *
   * IDEMPOTENT — webhook delivery is "at least once", not "exactly once":
   * gateways retry on timeout, ambiguous responses, or their own bugs, so
   * the exact same callback (same externalReference) can arrive 2, 3, N
   * times. Re-processing it must be a no-op, not a second Payment row and
   * not a second "flip to paid" / double-credited balance. This is enforced
   * with TWO layers, because a single check-then-act is not safe under
   * concurrency:
   *
   *   1. FIRST LINE OF DEFENSE (this method, up front): look up the Payment
   *      by its unique externalReference before doing anything else. If one
   *      already exists, this is a replay of a callback we've already fully
   *      processed — return that existing row as-is (HTTP 200) and stop.
   *      No new row is created, no invoice state is touched a second time.
   *
   *   2. SECOND LINE OF DEFENSE (race safety): the pre-check above has a
   *      TOCTOU gap — two concurrent deliveries of the same callback can
   *      both pass the "not found" check before either has committed its
   *      insert. The database's `@unique` constraint on
   *      Payment.externalReference is what actually closes that gap: only
   *      one of the two concurrent `payment.create` calls can succeed, and
   *      the loser fails with Prisma error code P2002 (unique constraint
   *      violation) instead of silently creating a duplicate. We catch
   *      exactly that error code, re-fetch the row the winner just
   *      inserted, and return it — turning what would otherwise be a 500
   *      into the same idempotent "already processed" response the
   *      up-front check gives, rather than ever double-processing a
   *      payment or double-crediting an invoice.
   */
  async handleCallback(dto: ProcessPaymentCallbackDto, actorId: string) {
    // --- Idempotency, line of defense #1 ---------------------------------
    // Same externalReference already recorded => this exact callback has
    // already been fully processed. Return it unchanged; do not touch the
    // invoice again.
    const existing = await this.prisma.payment.findUnique({
      where: { externalReference: dto.externalReference },
    });
    if (existing) {
      return existing;
    }

    // --- Verification ------------------------------------------------------
    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${dto.invoiceId} not found.`);
    }
    if (invoice.status === 'paid' || invoice.status === 'void') {
      throw new BadRequestException(
        `Invoice is already "${invoice.status}" — a payment callback cannot reopen or re-affect a settled invoice.`
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId: dto.invoiceId,
            amount: dto.amount,
            method: dto.method,
            status: dto.status,
            externalReference: dto.externalReference,
          },
        });

        // Only a completed callback moves money against the invoice. A
        // failed attempt is recorded for the audit trail (so support can
        // see "the gateway tried and failed") but must never touch
        // Invoice.status — the same rule recordPayment() applies.
        if (dto.status === 'completed') {
          const completedPayments = await tx.payment.findMany({
            where: { invoiceId: dto.invoiceId, status: 'completed' },
          });
          const paidSoFar = completedPayments.reduce((sum, p) => sum + p.amount, 0);
          if (paidSoFar >= invoice.totalAmount) {
            await tx.invoice.update({ where: { id: dto.invoiceId }, data: { status: 'paid' } });
          }
        }

        await this.auditOutbox.recordAudit(tx, {
          actorId,
          contextId: invoice.facilityId,
          action: 'payment.callback_processed',
          resourceType: 'Invoice',
          resourceId: dto.invoiceId,
          metadata: {
            paymentId: payment.id,
            externalReference: dto.externalReference,
            status: dto.status,
            amount: dto.amount,
            method: dto.method,
          },
        });
        await this.auditOutbox.publishEvent(tx, 'PaymentCallbackProcessed', {
          invoiceId: dto.invoiceId,
          paymentId: payment.id,
          externalReference: dto.externalReference,
          status: dto.status,
          amount: dto.amount,
        });

        return payment;
      });
    } catch (err: unknown) {
      // --- Idempotency, line of defense #2 (race safety) ------------------
      // A concurrent duplicate delivery raced past the up-front check above
      // and both attempted to insert the same externalReference; the
      // database's unique constraint let only one through. Treat the loser
      // the same way as a normal replay: fetch the winner's row and return
      // it, instead of surfacing a 500 for what is, from the caller's
      // (the gateway's) perspective, a successfully-processed callback.
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        const raceWinner = await this.prisma.payment.findUnique({
          where: { externalReference: dto.externalReference },
        });
        if (raceWinner) return raceWinner;
      }
      throw err;
    }
  }
}
