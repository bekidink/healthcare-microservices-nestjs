import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { AdmissionsService } from '../admissions/admissions.service';
import type { CreateEmergencyVisitDto } from './dto/create-emergency-visit.dto';
import type { AdmitEmergencyVisitDto } from './dto/admit-emergency-visit.dto';

// waiting -> in_treatment is a status a triage nurse can set as care begins;
// admitted and discharged are both terminal and reachable from either
// pre-resolution state — no endpoint for in_treatment is exposed yet (not
// asked for in this milestone), but the map still documents the full space
// and keeps admit/discharge's "already resolved" guard real rather than ad
// hoc.
const TRANSITIONS: Record<string, string[]> = {
  waiting: ['in_treatment', 'admitted', 'discharged'],
  in_treatment: ['admitted', 'discharged'],
  admitted: [],
  discharged: [],
};

function assertTransition(current: string, next: string) {
  if (!TRANSITIONS[current]?.includes(next)) {
    throw new BadRequestException(`Cannot move an emergency visit from "${current}" to "${next}".`);
  }
}

@Injectable()
export class EmergencyVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly admissionsService: AdmissionsService
  ) {}

  async create(dto: CreateEmergencyVisitDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.emergencyVisit.create({
        data: {
          patientId: dto.patientId,
          facilityId: dto.facilityId,
          chiefComplaint: dto.chiefComplaint,
          triageLevel: dto.triageLevel,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.facilityId,
        action: 'emergency_visit.created',
        resourceType: 'EmergencyVisit',
        resourceId: visit.id,
        metadata: { patientId: dto.patientId, triageLevel: dto.triageLevel },
      });
      await this.auditOutbox.publishEvent(tx, 'EmergencyVisitCreated', {
        emergencyVisitId: visit.id,
        patientId: dto.patientId,
        facilityId: dto.facilityId,
        triageLevel: dto.triageLevel,
      });

      return visit;
    });
  }

  async findById(id: string) {
    const visit = await this.prisma.emergencyVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Emergency visit not found.');
    return visit;
  }

  async list(facilityId?: string, status?: string) {
    return this.prisma.emergencyVisit.findMany({
      where: {
        ...(facilityId ? { facilityId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { arrivedAt: 'desc' },
    });
  }

  /**
   * Admits straight from the ER: applies the exact same bed-availability
   * guard as a direct admission by delegating to AdmissionsService.create
   * (same $transaction shape) rather than duplicating it, then flips this
   * visit's own status to admitted.
   */
  async admit(id: string, dto: AdmitEmergencyVisitDto, actorId: string) {
    const visit = await this.findById(id);
    assertTransition(visit.status, 'admitted');

    const admission = await this.admissionsService.create(
      {
        patientId: visit.patientId,
        wardId: dto.wardId,
        bedId: dto.bedId,
        admittingProviderId: dto.admittingProviderId,
      },
      actorId
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.emergencyVisit.update({ where: { id }, data: { status: 'admitted' } });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: visit.facilityId,
        action: 'emergency_visit.admitted',
        resourceType: 'EmergencyVisit',
        resourceId: id,
        metadata: { admissionId: admission.id },
      });

      return { ...updated, admission };
    });
  }

  async discharge(id: string, actorId: string) {
    const visit = await this.findById(id);
    assertTransition(visit.status, 'discharged');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.emergencyVisit.update({
        where: { id },
        data: { status: 'discharged', dischargedAt: new Date() },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: visit.facilityId,
        action: 'emergency_visit.discharged',
        resourceType: 'EmergencyVisit',
        resourceId: id,
      });

      return updated;
    });
  }
}
