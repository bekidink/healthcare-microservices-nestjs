import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SchedulingClientService } from './scheduling-client.service';

@Module({
  imports: [HttpModule],
  providers: [SchedulingClientService],
  exports: [SchedulingClientService],
})
export class SchedulingClientModule {}
