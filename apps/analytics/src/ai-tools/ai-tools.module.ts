import { Module } from '@nestjs/common';
import { JwtVerifyModule } from '@healthcare/shared';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';
import { PatientClientModule } from '../patient-client/patient-client.module';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [PatientClientModule, ClinicalClientModule, JwtVerifyModule],
  controllers: [AiToolsController],
  providers: [AiToolsService],
  exports: [AiToolsService],
})
export class AiToolsModule {}
