import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PatientClientService } from './patient-client.service';

@Module({
  imports: [HttpModule],
  providers: [PatientClientService],
  exports: [PatientClientService],
})
export class PatientClientModule {}
