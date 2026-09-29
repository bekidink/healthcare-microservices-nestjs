import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuditOutboxService } from '../common/audit-outbox.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuditOutboxService],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
