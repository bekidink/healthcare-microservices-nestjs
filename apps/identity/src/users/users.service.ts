import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { role: true } },
        provider: true,
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        facilityId: m.facilityId,
        role: m.role.name,
        status: m.status,
      })),
      provider: user.provider,
    };
  }

  /**
   * Resolves the flat permission-code set for a user, scoped to an
   * organization — this is what the gateway calls per-request to attach the
   * x-auth-permissions header, rather than trusting anything cached in the
   * access token itself (see packages/shared/src/auth/jwt-payload.ts).
   *
   * A platform super admin (User.isSuperAdmin) bypasses org-scoping
   * entirely and gets back the literal wildcard `['*']`, which
   * `PermissionGuard` (packages/shared) treats as "every permission" — the
   * only permission-resolution path that doesn't go through Membership at
   * all, on purpose (see the schema comment on User.isSuperAdmin for why
   * that's modeled as a flag, not a role).
   */
  async resolvePermissions(userId: string, organizationId?: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];
    if (user.isSuperAdmin) return ['*'];
    if (!organizationId) return [];

    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!membership || membership.status !== 'active') return [];

    return membership.role.permissions.map((rp) => rp.permission.code);
  }
}
