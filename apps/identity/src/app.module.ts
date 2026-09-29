import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { KafkaModule } from './kafka/kafka.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, KafkaModule, AuthModule, UsersModule],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
