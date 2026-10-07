import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PermissionGuard, RequirePermissions } from '@healthcare/shared';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';

function callerContext(req: Request) {
  const permissions = (req.headers['x-auth-permissions'] as string | undefined)?.split(',') ?? [];
  return {
    actorId: (req.headers['x-auth-user-id'] as string) || 'system',
    isSuperAdmin: permissions.includes('*'),
    organizationId: req.headers['x-auth-organization-id'] as string | undefined,
  };
}

@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @ApiOperation({
    summary: 'Grant (or update) a user\'s role within an organization',
    description:
      'Requires user.manage. A caller who is not a platform super admin may only grant memberships within ' +
      'their own active organization, even if they hold user.manage — see MembershipsService.create.',
  })
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('user.manage')
  create(@Body() dto: CreateMembershipDto, @Req() req: Request) {
    const ctx = callerContext(req);
    return this.membershipsService.create(dto, ctx.actorId, ctx.isSuperAdmin, ctx.organizationId);
  }

  @ApiOperation({ summary: "List an organization's memberships" })
  @Get()
  list(@Query('organizationId') organizationId: string) {
    return this.membershipsService.listByOrganization(organizationId);
  }

  @ApiOperation({ summary: 'Suspend a membership (revokes the role without deleting the history)' })
  @Post(':id/suspend')
  @UseGuards(PermissionGuard)
  @RequirePermissions('user.manage')
  suspend(@Param('id') id: string, @Req() req: Request) {
    const ctx = callerContext(req);
    return this.membershipsService.suspend(id, ctx.actorId, ctx.isSuperAdmin, ctx.organizationId);
  }
}
