import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClinicalClientService } from './clinical-client.service';

@Module({
  imports: [HttpModule],
  providers: [ClinicalClientService],
  exports: [ClinicalClientService],
})
export class ClinicalClientModule {}
