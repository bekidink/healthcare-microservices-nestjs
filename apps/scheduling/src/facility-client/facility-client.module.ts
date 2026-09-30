import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FacilityClientService } from './facility-client.service';

@Module({
  imports: [HttpModule],
  providers: [FacilityClientService],
  exports: [FacilityClientService],
})
export class FacilityClientModule {}
