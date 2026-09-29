import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomInt } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { AccessTokenPayload, RefreshTokenPayload } from '@healthcare/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import type { OtpPurpose } from './dto/otp.dto';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const generateOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auditOutbox: AuditOutboxService
  ) {}

  async register(params: { email: string; password: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (existing) throw new BadRequestException('An account with this email already exists.');

    const passwordHash = await argon2.hash(params.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: params.email,
          phone: params.phone,
          passwordHash,
          status: 'pending_verification',
        },
      });

      await this.auditOutbox.recordAudit(tx, {
        actorId: created.id,
        action: 'user.registered',
        resourceType: 'User',
        resourceId: created.id,
      });
      await this.auditOutbox.publishEvent(tx, 'UserRegistered', {
        userId: created.id,
        email: created.email,
      });

      return created;
    });

    return { id: user.id, email: user.email, status: user.status };
  }

  async login(params: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: params.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials.');

    const valid = await argon2.verify(user.passwordHash, params.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    if (user.status === 'disabled') throw new UnauthorizedException('This account is disabled.');

    return this.issueTokens(user.id, user.tokenVersion, {
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
  }

  async refresh(params: { refreshToken: string }) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(params.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session no longer valid.');
    }
    if (session.refreshTokenHash !== hashToken(params.refreshToken)) {
      // Token doesn't match the session's current hash — either it was
      // already rotated (reuse of a stale token) or tampered with. Revoke
      // the session outright rather than silently accepting it.
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected; session revoked.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    // Rotate: revoke the session being consumed, issue a brand new one.
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.tokenVersion, {
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    });
  }

  async logout(params: { sessionId: string }) {
    await this.prisma.userSession.updateMany({
      where: { id: params.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async requestOtp(params: { userId: string; purpose: OtpPurpose }) {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new BadRequestException('Unknown user.');

    const code = generateOtpCode();
    await this.prisma.otpCode.create({
      data: {
        userId: params.userId,
        purpose: params.purpose,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      },
    });

    // No SMS/email gateway wired up yet — return the code only in
    // non-production so the flow is testable end-to-end locally.
    const devCode = process.env.NODE_ENV === 'production' ? undefined : code;
    return { sent: true, devCode };
  }

  async verifyOtp(params: { userId: string; purpose: OtpPurpose; code: string }) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId: params.userId, purpose: params.purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('No pending code for this user/purpose.');
    if (otp.expiresAt < new Date()) throw new UnauthorizedException('Code expired.');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new UnauthorizedException('Too many attempts.');

    if (otp.codeHash !== hashToken(params.code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    if (params.purpose === 'login' || params.purpose === 'mfa') {
      return this.issueTokens(user.id, user.tokenVersion, {});
    }

    return { verified: true };
  }

  private async issueTokens(
    userId: string,
    tokenVersion: number,
    context: { userAgent?: string; ipAddress?: string }
  ) {
    const sessionId = uuid();
    const now = Math.floor(Date.now() / 1000);

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      tokenVersion,
      iat: now,
      exp: now + ACCESS_TTL_SECONDS,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      iat: now,
      exp: now + REFRESH_TTL_SECONDS,
    };

    // exp/iat are already set explicitly on both payloads above, so no
    // `expiresIn` option here — jsonwebtoken rejects passing both.
    const accessToken = await this.jwt.signAsync(accessPayload);
    const refreshToken = await this.jwt.signAsync(refreshPayload);

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
  }
}
