import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MembershipsModule } from './memberships/memberships.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, AuthModule, UsersModule, MembershipsModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
