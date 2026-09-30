import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async create(dto: CreateOrganizationDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: dto });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        action: 'organization.created',
        resourceType: 'Organization',
        resourceId: org.id,
      });
      await this.auditOutbox.publishEvent(tx, 'OrganizationCreated', {
        organizationId: org.id,
        type: org.type,
      });

      return org;
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { facilities: true },
    });
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }
}
