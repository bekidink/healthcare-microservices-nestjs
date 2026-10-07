import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthContextMiddleware } from './common/auth-context.middleware';
import { IdentityClientModule } from './identity-client/identity-client.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120, // per IP, across the whole gateway; tighten per-route later as needed
      },
    ]),
    IdentityClientModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, AuthContextMiddleware).forRoutes('*');
  }
}
