import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateFacilityDto } from './dto/create-facility.dto';
import type { UpdateFacilityConfigurationDto } from './dto/update-configuration.dto';
import type { CreateFacilityServiceDto } from './dto/create-facility-service.dto';

// Sensible starting capability set per facility type (PRD Sec 3:
// capability-based configuration) — all editable afterward via
// PATCH /facilities/:id/configuration. A hospital defaults to everything on
// since it's expected to grow into the full set; a clinic/pharmacy/
// diagnostic center default to just what that facility type implies.
const DEFAULT_CAPABILITIES: Record<string, Record<string, boolean>> = {
  hospital: {
    outpatient: true,
    inpatient: true,
    emergency: true,
    theatre: true,
    pharmacy: true,
    lab: true,
    radiology: true,
  },
  clinic: {
    outpatient: true,
    inpatient: false,
    emergency: false,
    theatre: false,
    pharmacy: false,
    lab: false,
    radiology: false,
  },
  pharmacy: {
    outpatient: false,
    inpatient: false,
    emergency: false,
    theatre: false,
    pharmacy: true,
    lab: false,
    radiology: false,
  },
  diagnostic_center: {
    outpatient: false,
    inpatient: false,
    emergency: false,
    theatre: false,
    pharmacy: false,
    lab: true,
    radiology: true,
  },
};

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(organizationId: string, dto: CreateFacilityDto, actorId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found.');

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: { ...dto, organizationId },
      });

      await tx.facilityConfiguration.create({
        data: {
          facilityId: facility.id,
          capabilities: DEFAULT_CAPABILITIES[dto.type] ?? {},
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: organizationId,
        action: 'facility.created',
        resourceType: 'Facility',
        resourceId: facility.id,
      });
      await this.auditOutbox.publishEvent(tx, 'FacilityCreated', {
        facilityId: facility.id,
        organizationId,
        type: facility.type,
      });

      return facility;
    });
  }

  async findById(id: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: { configuration: true, departments: true, services: true },
    });
    if (!facility) throw new NotFoundException('Facility not found.');
    return facility;
  }

  async listByOrganization(organizationId: string) {
    return this.prisma.facility.findMany({ where: { organizationId } });
  }

  async getConfiguration(facilityId: string) {
    const config = await this.prisma.facilityConfiguration.findUnique({ where: { facilityId } });
    if (!config) throw new NotFoundException('Facility configuration not found.');
    return config;
  }

  async updateConfiguration(facilityId: string, dto: UpdateFacilityConfigurationDto, actorId: string) {
    const existing = await this.getConfiguration(facilityId);
    const mergedCapabilities = {
      ...(existing.capabilities as Record<string, boolean>),
      ...dto.capabilities,
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.facilityConfiguration.update({
        where: { facilityId },
        data: { capabilities: mergedCapabilities },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'facility.configuration_updated',
        resourceType: 'FacilityConfiguration',
        resourceId: updated.id,
        metadata: { changed: dto.capabilities },
      });
      await this.auditOutbox.publishEvent(tx, 'FacilityConfigurationUpdated', {
        facilityId,
        capabilities: mergedCapabilities,
      });

      return updated;
    });
  }

  async createService(facilityId: string, dto: CreateFacilityServiceDto, actorId: string) {
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new NotFoundException('Facility not found.');

    return this.prisma.$transaction(async (tx) => {
      const service = await tx.facilityService.create({
        data: {
          facilityId,
          departmentId: dto.departmentId,
          name: dto.name,
          code: dto.code,
          isBillable: dto.isBillable ?? true,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: facilityId,
        action: 'facility_service.created',
        resourceType: 'FacilityService',
        resourceId: service.id,
      });
      await this.auditOutbox.publishEvent(tx, 'FacilityServicePublished', {
        facilityServiceId: service.id,
        facilityId,
        code: service.code,
      });

      return service;
    });
  }

  async listServices(facilityId: string) {
    return this.prisma.facilityService.findMany({ where: { facilityId } });
  }
}
