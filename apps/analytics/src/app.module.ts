import { Module } from '@nestjs/common';
import { JwtVerifyModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { AnalyticsSnapshotsModule } from './analytics-snapshots/analytics-snapshots.module';
import { AiToolsModule } from './ai-tools/ai-tools.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, JwtVerifyModule, AnalyticsSnapshotsModule, AiToolsModule],
  controllers: [HealthController],
})
export class AppModule {}
