import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from '@healthcare/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token.');

    const token = header.slice('Bearer '.length);
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt) throw new UnauthorizedException('Session revoked.');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found.');
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token has been superseded.');
    }

    request.authUser = { userId: user.id, sessionId: payload.sid };
    return true;
  }
}
