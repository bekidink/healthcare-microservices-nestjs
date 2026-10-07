import { Module } from '@nestjs/common';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { AuditOutboxService } from '../common/audit-outbox.service';
import { SchedulingClientModule } from '../scheduling-client/scheduling-client.module';

@Module({
  imports: [SchedulingClientModule],
  controllers: [EncountersController],
  providers: [EncountersService, AuditOutboxService],
  exports: [EncountersService],
})
export class EncountersModule {}
