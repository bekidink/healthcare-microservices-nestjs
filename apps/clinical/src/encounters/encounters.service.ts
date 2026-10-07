import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { SchedulingClientService } from '../scheduling-client/scheduling-client.service';
import type { CreateEncounterDto } from './dto/create-encounter.dto';

// An encounter represents care actually being given — it shouldn't exist
// before the patient has been checked in for the appointment it's attached to.
const APPOINTMENT_STATUSES_ALLOWING_ENCOUNTER = ['checked_in', 'in_service', 'completed'];

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly schedulingClient: SchedulingClientService
  ) {}

  async create(dto: CreateEncounterDto, actorId: string) {
    let patientId = dto.patientId;
    let providerId = dto.providerId;
    let facilityId = dto.facilityId;
    let departmentId = dto.departmentId;

    if (dto.appointmentId) {
      const appointment = await this.schedulingClient.getAppointment(dto.appointmentId);
      if (!appointment) {
        throw new NotFoundException(`Appointment ${dto.appointmentId} not found in the Scheduling service.`);
      }
      if (!APPOINTMENT_STATUSES_ALLOWING_ENCOUNTER.includes(appointment.status)) {
        throw new BadRequestException(
          `Appointment ${dto.appointmentId} is "${appointment.status}" — the patient must be checked in before an encounter can start.`
        );
      }
      patientId = appointment.patientId;
      providerId = appointment.providerId;
      facilityId = appointment.facilityId;
      departmentId = appointment.departmentId ?? undefined;
    }

    if (!patientId || !providerId || !facilityId) {
      throw new BadRequestException(
        'Either appointmentId, or patientId + providerId + facilityId directly (for a walk-in), are required.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.create({
        data: {
          appointmentId: dto.appointmentId,
          patientId,
          providerId,
          facilityId,
          departmentId,
          encounterType: dto.encounterType,
          chiefComplaint: dto.chiefComplaint,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'encounter.started',
        resourceType: 'Encounter',
        resourceId: encounter.id,
        metadata: { patientId, appointmentId: dto.appointmentId },
      });
      await this.auditOutbox.publishEvent(tx, 'EncounterStarted', {
        encounterId: encounter.id,
        patientId,
        providerId,
        facilityId,
      });

      return encounter;
    });
  }

  async findById(id: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id },
      include: { vitals: true, notes: true, diagnoses: true },
    });
    if (!encounter) throw new NotFoundException('Encounter not found.');
    return encounter;
  }

  async listByPatient(patientId: string) {
    return this.prisma.encounter.findMany({
      where: { patientId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async complete(id: string, actorId: string) {
    const encounter = await this.findById(id);
    if (encounter.status !== 'in_progress') {
      throw new BadRequestException(`Encounter is "${encounter.status}", not in_progress.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.encounter.update({
        where: { id },
        data: { status: 'completed', endedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: encounter.facilityId,
        action: 'encounter.completed',
        resourceType: 'Encounter',
        resourceId: id,
      });
      await this.auditOutbox.publishEvent(tx, 'EncounterCompleted', {
        encounterId: id,
        patientId: encounter.patientId,
      });

      return updated;
    });
  }

  async cancel(id: string, actorId: string) {
    const encounter = await this.findById(id);
    if (encounter.status !== 'in_progress') {
      throw new BadRequestException(`Encounter is "${encounter.status}", not in_progress.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.encounter.update({
        where: { id },
        data: { status: 'cancelled', endedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: encounter.facilityId,
        action: 'encounter.cancelled',
        resourceType: 'Encounter',
        resourceId: id,
      });

      return updated;
    });
  }
}
