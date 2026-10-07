import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { FhirModule } from './fhir/fhir.module';
import { HealthController } from './health/health.controller';

// No KafkaModule here, unlike every other service in this monorepo — Interop
// makes no domain state changes (it only reads Patient/Clinical over REST
// and translates the result into FHIR shapes), so there is nothing for it
// to publish to the outbox. No JwtVerifyModule either: every route this
// service exposes is a GET, and the shared guard already passes all GET
// requests through regardless, so wiring it up here would be a no-op.
@Module({
  imports: [PrismaModule, FhirModule],
  controllers: [HealthController],
})
export class AppModule {}
