import { Module } from '@nestjs/common';
import { AnalyticsSnapshotsController } from './analytics-snapshots.controller';
import { AnalyticsSnapshotsService } from './analytics-snapshots.service';
import { PharmacyClientModule } from '../pharmacy-client/pharmacy-client.module';

@Module({
  imports: [PharmacyClientModule],
  controllers: [AnalyticsSnapshotsController],
  providers: [AnalyticsSnapshotsService],
  exports: [AnalyticsSnapshotsService],
})
export class AnalyticsSnapshotsModule {}
