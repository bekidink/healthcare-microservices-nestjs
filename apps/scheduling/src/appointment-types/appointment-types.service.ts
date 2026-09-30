import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';

@Injectable()
export class AppointmentTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateAppointmentTypeDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const type = await tx.appointmentType.create({
        data: {
          facilityId: dto.facilityId,
          name: dto.name,
          code: dto.code,
          defaultDurationMins: dto.defaultDurationMins ?? 30,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.facilityId,
        action: 'appointment_type.created',
        resourceType: 'AppointmentType',
        resourceId: type.id,
      });

      return type;
    });
  }

  async listByFacility(facilityId: string) {
    return this.prisma.appointmentType.findMany({ where: { facilityId, isActive: true } });
  }
}
