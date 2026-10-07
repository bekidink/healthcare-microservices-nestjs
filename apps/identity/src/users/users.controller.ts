import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Get the authenticated user's profile and memberships" })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.userId);
  }
}

/**
 * Internal, service-to-service surface — never exposed through the public
 * gateway route table, and excluded from the public Swagger doc too.
 */
@ApiExcludeController()
@Controller('internal')
export class InternalController {
  constructor(private readonly usersService: UsersService) {}

  @Get('permissions')
  async getPermissions(@Query('userId') userId: string, @Query('organizationId') organizationId?: string) {
    const permissions = await this.usersService.resolvePermissions(userId, organizationId);
    return { permissions };
  }
}
