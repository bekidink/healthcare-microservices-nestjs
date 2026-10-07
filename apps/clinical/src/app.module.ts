import { Module } from '@nestjs/common';
import { KafkaModule } from '@healthcare/shared';
import { PrismaModule } from './prisma/prisma.module';
import { OutboxPublisherService } from './kafka/outbox-publisher.service';
import { EncountersModule } from './encounters/encounters.module';
import { VitalsModule } from './vitals/vitals.module';
import { ClinicalNotesModule } from './clinical-notes/clinical-notes.module';
import { DiagnosesModule } from './diagnoses/diagnoses.module';
import { ProblemListModule } from './problem-list/problem-list.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    PrismaModule,
    KafkaModule,
    EncountersModule,
    VitalsModule,
    ClinicalNotesModule,
    DiagnosesModule,
    ProblemListModule,
  ],
  controllers: [HealthController],
  providers: [OutboxPublisherService],
})
export class AppModule {}
