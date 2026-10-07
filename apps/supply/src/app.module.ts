import { Module } from '@nestjs/common';
import { KafkaModule, JwtVerifyModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { SupplyItemsModule } from './supply-items/supply-items.module';
import { InsurancePoliciesModule } from './insurance-policies/insurance-policies.module';
import { ClaimsModule } from './claims/claims.module';
import { ReferralsModule } from './referrals/referrals.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    PrismaModule,
    KafkaModule,
    JwtVerifyModule,
    SupplyItemsModule,
    InsurancePoliciesModule,
    ClaimsModule,
    ReferralsModule,
  ],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
