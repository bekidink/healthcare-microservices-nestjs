import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IdentityClientService } from './identity-client.service';

@Module({
  imports: [HttpModule],
  providers: [IdentityClientService],
  exports: [IdentityClientService],
})
export class IdentityClientModule {}
