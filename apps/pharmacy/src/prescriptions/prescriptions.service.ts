import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { ClinicalClientService } from '../clinical-client/clinical-client.service';
import type { CreatePrescriptionDto } from './dto/create-prescription.dto';

// A prescription should be tied to care that's actually happening — not a
// booking that hasn't started yet.
const ENCOUNTER_STATUSES_ALLOWING_PRESCRIPTION = ['in_progress', 'completed'];

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly clinicalClient: ClinicalClientService
  ) {}

  async create(dto: CreatePrescriptionDto, actorId: string) {
    let patientId = dto.patientId;
    let providerId = dto.providerId;
    let facilityId = dto.facilityId;

    if (dto.encounterId) {
      const encounter = await this.clinicalClient.getEncounter(dto.encounterId);
      if (!encounter) {
        throw new NotFoundException(`Encounter ${dto.encounterId} not found in the Clinical service.`);
      }
      if (!ENCOUNTER_STATUSES_ALLOWING_PRESCRIPTION.includes(encounter.status)) {
        throw new BadRequestException(
          `Encounter ${dto.encounterId} is "${encounter.status}" — it must be in_progress (or completed) to prescribe against it.`
        );
      }
      patientId = encounter.patientId;
      providerId = encounter.providerId;
      facilityId = encounter.facilityId;
    }

    if (!patientId || !providerId || !facilityId) {
      throw new BadRequestException(
        'Either encounterId, or patientId + providerId + facilityId directly (for a standalone prescription), are required.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          encounterId: dto.encounterId,
          patientId,
          providerId,
          facilityId,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              medicationCode: item.medicationCode,
              medicationName: item.medicationName,
              dosage: item.dosage,
              frequency: item.frequency,
              durationDays: item.durationDays,
              quantityPrescribed: item.quantityPrescribed,
            })),
          },
        },
        include: { items: true },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'prescription.created',
        resourceType: 'Prescription',
        resourceId: prescription.id,
        metadata: { patientId, encounterId: dto.encounterId, medications: dto.items.map((i) => i.medicationCode) },
      });
      await this.auditOutbox.publishEvent(tx, 'PrescriptionCreated', {
        prescriptionId: prescription.id,
        patientId,
        facilityId,
      });

      return prescription;
    });
  }

  async findById(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: { include: { dispense: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found.');
    return prescription;
  }

  async listByPatient(patientId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId },
      orderBy: { prescribedAt: 'desc' },
      include: { items: true },
    });
  }

  /** Flips to dispensed once every item has been dispensed — called by DispenseService, not exposed directly. */
  async markDispensedIfAllItemsDispensed(id: string) {
    const items = await this.prisma.prescriptionItem.findMany({ where: { prescriptionId: id } });
    const allDispensed = items.length > 0 && items.every((item) => item.status === 'dispensed');
    if (allDispensed) {
      await this.prisma.prescription.updateMany({
        where: { id, status: { not: 'cancelled' } },
        data: { status: 'dispensed' },
      });
    }
  }

  async cancel(id: string, actorId: string) {
    const prescription = await this.findById(id);
    if (prescription.status === 'dispensed' || prescription.status === 'cancelled') {
      throw new BadRequestException(`Prescription is already "${prescription.status}".`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.prescription.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.prescriptionItem.updateMany({
        where: { prescriptionId: id, status: { not: 'dispensed' } },
        data: { status: 'cancelled' },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: prescription.facilityId,
        action: 'prescription.cancelled',
        resourceType: 'Prescription',
        resourceId: id,
      });

      return updated;
    });
  }
}
