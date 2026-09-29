import { Module } from '@nestjs/common';
import { UsersController, InternalController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, InternalController],
  providers: [UsersService],
})
export class UsersModule {}
