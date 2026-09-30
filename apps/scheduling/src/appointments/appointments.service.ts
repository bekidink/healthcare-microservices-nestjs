import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { CancelAppointmentDto } from './dto/cancel-appointment.dto';

// PRD Sec 27: REQUESTED -> CONFIRMED -> CHECKED_IN -> IN_SERVICE -> COMPLETED,
// with CANCELLED reachable from any pre-completion state and NO_SHOW
// reachable once the patient was expected to check in.
const TRANSITIONS: Record<string, string[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_service', 'cancelled', 'no_show'],
  in_service: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function assertTransition(current: string, next: string) {
  if (!TRANSITIONS[current]?.includes(next)) {
    throw new BadRequestException(`Cannot move an appointment from "${current}" to "${next}".`);
  }
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateAppointmentDto, actorId: string) {
    const slot = await this.prisma.scheduleSlot.findUnique({ where: { id: dto.slotId } });
    if (!slot) throw new NotFoundException('Schedule slot not found.');
    if (slot.status !== 'open') throw new BadRequestException('This slot is not open for booking.');

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: dto.patientId,
          providerId: slot.providerId,
          facilityId: slot.facilityId,
          departmentId: slot.departmentId,
          appointmentTypeId: dto.appointmentTypeId,
          slotId: dto.slotId,
          reason: dto.reason,
        },
      });

      await tx.scheduleSlot.update({ where: { id: dto.slotId }, data: { status: 'booked' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: slot.facilityId,
        action: 'appointment.requested',
        resourceType: 'Appointment',
        resourceId: appointment.id,
        metadata: { patientId: dto.patientId, slotId: dto.slotId },
      });
      await this.auditOutbox.publishEvent(tx, 'AppointmentRequested', {
        appointmentId: appointment.id,
        patientId: dto.patientId,
        providerId: slot.providerId,
        facilityId: slot.facilityId,
      });

      return appointment;
    });
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true, queueEntry: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    return appointment;
  }

  async confirm(id: string, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'confirmed');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'confirmed', confirmedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.confirmed',
        resourceType: 'Appointment',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'AppointmentConfirmed', { appointmentId: id });

      return updated;
    });
  }

  /** Checking in also opens this appointment's QueueEntry with the next sequential number for that facility/department/day. */
  async checkIn(id: string, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'checked_in');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'checked_in', checkedInAt: new Date() },
      });

      const lastInQueue = await tx.queueEntry.findFirst({
        where: { facilityId: appointment.facilityId, departmentId: appointment.departmentId },
        orderBy: { queueNumber: 'desc' },
      });
      const queueEntry = await tx.queueEntry.create({
        data: {
          appointmentId: id,
          facilityId: appointment.facilityId,
          departmentId: appointment.departmentId,
          queueNumber: (lastInQueue?.queueNumber ?? 0) + 1,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.checked_in',
        resourceType: 'Appointment',
        resourceId: id,
        metadata: { queueNumber: queueEntry.queueNumber },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientCheckedIn', {
        appointmentId: id,
        facilityId: appointment.facilityId,
        queueNumber: queueEntry.queueNumber,
      });

      return { ...updated, queueEntry };
    });
  }

  async start(id: string, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'in_service');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'in_service', startedAt: new Date() },
      });

      await tx.queueEntry.updateMany({
        where: { appointmentId: id },
        data: { status: 'in_service', calledAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.started',
        resourceType: 'Appointment',
        resourceId: id,
      });

      return updated;
    });
  }

  async complete(id: string, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'completed');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() },
      });

      await tx.queueEntry.updateMany({
        where: { appointmentId: id },
        data: { status: 'done', completedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.completed',
        resourceType: 'Appointment',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'AppointmentCompleted', {
        appointmentId: id,
        patientId: appointment.patientId,
      });

      return updated;
    });
  }

  /** Cancelling ahead of the appointment reopens the slot for someone else to book; a no-show does not (see noShow below). */
  async cancel(id: string, dto: CancelAppointmentDto, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'cancelled');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: dto.reason },
      });

      await tx.scheduleSlot.update({ where: { id: appointment.slotId }, data: { status: 'open' } });
      await tx.queueEntry.updateMany({ where: { appointmentId: id }, data: { status: 'skipped' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.cancelled',
        resourceType: 'Appointment',
        resourceId: id,
        metadata: { reason: dto.reason },
      });
      await this.auditOutbox.publishEvent(tx, 'AppointmentCancelled', { appointmentId: id });

      return updated;
    });
  }

  async noShow(id: string, actorId: string) {
    const appointment = await this.findById(id);
    assertTransition(appointment.status, 'no_show');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'no_show' },
      });

      await tx.queueEntry.updateMany({ where: { appointmentId: id }, data: { status: 'skipped' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: appointment.facilityId,
        action: 'appointment.no_show',
        resourceType: 'Appointment',
        resourceId: id,
      });

      return updated;
    });
  }
}
