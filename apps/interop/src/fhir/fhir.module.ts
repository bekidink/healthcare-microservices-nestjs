import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { PatientClientModule } from '../patient-client/patient-client.module';
import { ClinicalClientModule } from '../clinical-client/clinical-client.module';

@Module({
  imports: [PatientClientModule, ClinicalClientModule],
  controllers: [FhirController],
  providers: [FhirService],
})
export class FhirModule {}
