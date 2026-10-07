import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtVerifyGuard } from './jwt-verify.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    }),
  ],
  providers: [JwtVerifyGuard],
  exports: [JwtVerifyGuard],
})
export class JwtVerifyModule {}
