import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientService } from '../clinical-client/clinical-client.service';
import { assertBedTransition } from '../wards/bed-transitions';
import type { CreateAdmissionDto } from './dto/create-admission.dto';
import type { DischargeAdmissionDto } from './dto/discharge-admission.dto';
import type { TransferAdmissionDto } from './dto/transfer-admission.dto';

// An Admission only ever has two reachable states — admitted and
// discharged, with discharge terminal — so unlike Bed (which gets a real
// TRANSITIONS map; see wards/bed-transitions.ts) a single `already
// discharged` guard covers it.

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  /**
   * Admits a patient into a specific bed. Used both directly (POST
   * /admissions) and by EmergencyVisitsService.admit, which calls this same
   * method rather than duplicating the bed-availability guard + transaction
   * shape.
   */
  async create(dto: CreateAdmissionDto, actorId: string) {
    if (dto.encounterId) {
      const encounter = await this.clinicalClient.getEncounter(dto.encounterId);
      if (!encounter) {
        throw new NotFoundException(`Encounter ${dto.encounterId} not found in the Clinical service.`);
      }
      // No status requirement here (unlike Clinical/Lab's "must be
      // in_progress") — an admission can legitimately follow a completed
      // encounter, e.g. post-surgical.
    }

    const bed = await this.prisma.bed.findUnique({ where: { id: dto.bedId } });
    if (!bed) throw new NotFoundException('Bed not found.');
    if (bed.wardId !== dto.wardId) throw new BadRequestException('Bed does not belong to the given ward.');
    if (bed.status !== 'available') {
      throw new BadRequestException(`Bed "${bed.bedNumber}" is "${bed.status}" — it must be available to admit into.`);
    }
    assertBedTransition(bed.status, 'occupied');

    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({ where: { id: bed.id }, data: { status: 'occupied' } });

      const admission = await tx.admission.create({
        data: {
          patientId: dto.patientId,
          encounterId: dto.encounterId,
          wardId: dto.wardId,
          bedId: dto.bedId,
          admittingProviderId: dto.admittingProviderId,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.wardId,
        action: 'patient.admitted',
        resourceType: 'Admission',
        resourceId: admission.id,
        metadata: { patientId: dto.patientId, bedId: dto.bedId, encounterId: dto.encounterId },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientAdmitted', {
        admissionId: admission.id,
        patientId: dto.patientId,
        wardId: dto.wardId,
        bedId: dto.bedId,
      });

      return admission;
    });
  }

  async findById(id: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id },
      include: { bed: true, transfers: true },
    });
    if (!admission) throw new NotFoundException('Admission not found.');
    return admission;
  }

  async listByPatient(patientId?: string) {
    if (!patientId) return [];
    return this.prisma.admission.findMany({
      where: { patientId },
      orderBy: { admittedAt: 'desc' },
      include: { bed: true },
    });
  }

  /** Discharges the patient and sends the bed to cleaning — never straight back to available; a bed needs turnover first. */
  async discharge(id: string, dto: DischargeAdmissionDto, actorId: string) {
    const admission = await this.findById(id);
    if (admission.status === 'discharged') {
      throw new BadRequestException('This admission is already discharged.');
    }

    const bed = await this.prisma.bed.findUnique({ where: { id: admission.bedId } });
    if (!bed) throw new NotFoundException('Bed not found.');
    assertBedTransition(bed.status, 'cleaning');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id },
        data: { status: 'discharged', dischargedAt: new Date(), dischargeNotes: dto.dischargeNotes },
      });

      await tx.bed.update({ where: { id: admission.bedId }, data: { status: 'cleaning' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: admission.wardId,
        action: 'patient.discharged',
        resourceType: 'Admission',
        resourceId: id,
        metadata: { patientId: admission.patientId },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientDischarged', {
        admissionId: id,
        patientId: admission.patientId,
      });

      return updated;
    });
  }

  /** Moves the admission to a new bed: old bed -> cleaning, new bed -> occupied, plus a Transfer record. */
  async transfer(id: string, dto: TransferAdmissionDto, actorId: string) {
    const admission = await this.findById(id);
    if (admission.status === 'discharged') {
      throw new BadRequestException('Cannot transfer a discharged admission.');
    }

    const toBed = await this.prisma.bed.findUnique({ where: { id: dto.toBedId } });
    if (!toBed) throw new NotFoundException('Destination bed not found.');
    if (toBed.status !== 'available') {
      throw new BadRequestException(`Bed "${toBed.bedNumber}" is "${toBed.status}" — it must be available to transfer into.`);
    }
    assertBedTransition(toBed.status, 'occupied');

    const fromBedId = admission.bedId;
    const fromBed = await this.prisma.bed.findUnique({ where: { id: fromBedId } });
    if (!fromBed) throw new NotFoundException('Current bed not found.');
    assertBedTransition(fromBed.status, 'cleaning');

    return this.prisma.$transaction(async (tx) => {
      await tx.bed.update({ where: { id: fromBedId }, data: { status: 'cleaning' } });
      await tx.bed.update({ where: { id: toBed.id }, data: { status: 'occupied' } });

      const updated = await tx.admission.update({
        where: { id },
        data: { wardId: toBed.wardId, bedId: toBed.id },
      });

      const transfer = await tx.transfer.create({
        data: {
          admissionId: id,
          fromBedId,
          toBedId: toBed.id,
          reason: dto.reason,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: toBed.wardId,
        action: 'patient.transferred',
        resourceType: 'Admission',
        resourceId: id,
        metadata: { fromBedId, toBedId: toBed.id, reason: dto.reason },
      });
      await this.auditOutbox.publishEvent(tx, 'PatientTransferred', {
        admissionId: id,
        patientId: admission.patientId,
        fromBedId,
        toBedId: toBed.id,
      });

      return { ...updated, transfer };
    });
  }
}
