import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Create a new user account (status: pending_verification)' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Authenticate with email + password, issuing access/refresh tokens' })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login({
      ...dto,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @ApiOperation({ summary: 'Rotate a refresh token for a new access/refresh pair' })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: 'Revoke the current session (requires a valid access token)' })
  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout({ sessionId: user.sessionId });
  }

  @ApiOperation({ summary: 'Request a one-time code for the given purpose (dev builds return the code directly)' })
  @Post('otp/request')
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto);
  }

  @ApiOperation({ summary: 'Verify a one-time code; issues tokens for login/mfa purposes' })
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @ApiOperation({
    summary: "Re-scope the current session to a different organization the caller is a member of",
    description:
      'Issues a fresh access token with a new activeOrganizationId — for staff who belong to more than one ' +
      'hospital/organization. The refresh token and session identity are unchanged.',
  })
  @ApiBearerAuth()
  @Post('switch-organization')
  @UseGuards(JwtAuthGuard)
  switchOrganization(@CurrentUser() user: AuthenticatedUser, @Body() dto: SwitchOrganizationDto) {
    return this.authService.switchOrganization({
      userId: user.userId,
      sessionId: user.sessionId,
      organizationId: dto.organizationId,
    });
  }
}
