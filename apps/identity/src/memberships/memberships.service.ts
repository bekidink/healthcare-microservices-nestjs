import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { CreateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  /**
   * Grants (or updates) a user's role within an organization. The one
   * real authorization rule beyond the `user.manage` permission code
   * itself: a caller who isn't a platform super admin can only grant
   * memberships within THEIR OWN active organization — `user.manage`
   * alone doesn't let an org A admin reach into org B, since
   * PermissionGuard only checks that the permission code is present, not
   * which organization it was resolved for. That cross-check happens here,
   * against the caller's own activeOrganizationId (the gateway-forwarded,
   * trusted `x-auth-organization-id` header), not anything client-supplied.
   */
  async create(dto: CreateMembershipDto, actorId: string, callerIsSuperAdmin: boolean, callerOrganizationId?: string) {
    if (!callerIsSuperAdmin && dto.organizationId !== callerOrganizationId) {
      throw new ForbiddenException(
        "You can only grant memberships within your own organization. A platform super admin can grant in any organization."
      );
    }

    const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
    if (!role) throw new BadRequestException(`Unknown role "${dto.roleName}".`);

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found.');

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.membership.upsert({
        where: { userId_organizationId: { userId: dto.userId, organizationId: dto.organizationId } },
        update: { roleId: role.id, facilityId: dto.facilityId, status: 'active' },
        create: {
          userId: dto.userId,
          organizationId: dto.organizationId,
          facilityId: dto.facilityId,
          roleId: role.id,
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: dto.organizationId,
        action: 'membership.granted',
        resourceType: 'Membership',
        resourceId: created.id,
        metadata: { userId: dto.userId, roleName: dto.roleName, facilityId: dto.facilityId },
      });

      return created;
    });

    return { ...membership, roleName: role.name };
  }

  async listByOrganization(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: { role: true, user: { select: { id: true, email: true, phone: true, status: true } } },
    });
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      user: m.user,
      organizationId: m.organizationId,
      facilityId: m.facilityId,
      role: m.role.name,
      status: m.status,
    }));
  }

  async suspend(id: string, actorId: string, callerIsSuperAdmin: boolean, callerOrganizationId?: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('Membership not found.');
    if (!callerIsSuperAdmin && membership.organizationId !== callerOrganizationId) {
      throw new ForbiddenException('You can only manage memberships within your own organization.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({ where: { id }, data: { status: 'suspended' } });
      await this.auditOutbox.recordAudit(tx, {
        actorId,
        contextId: membership.organizationId,
        action: 'membership.suspended',
        resourceType: 'Membership',
        resourceId: id,
      });
      return updated;
    });
  }
}
