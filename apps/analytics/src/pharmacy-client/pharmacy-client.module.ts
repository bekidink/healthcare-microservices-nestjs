import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PharmacyClientService } from './pharmacy-client.service';

@Module({
  imports: [HttpModule],
  providers: [PharmacyClientService],
  exports: [PharmacyClientService],
})
export class PharmacyClientModule {}
