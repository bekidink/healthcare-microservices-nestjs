import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('reminders')
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @ApiOperation({ summary: 'Schedule a reminder for an appointment (does not send anything itself — see class docs)' })
  @Post()
  create(@Body() dto: CreateReminderDto, @ActorId() actorId: string) {
    return this.remindersService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'List pending reminders due at or before the given time (for a future Notification service to poll)' })
  @Get('due')
  listDue(@Query('before') before?: string) {
    return this.remindersService.listDue(before);
  }

  @ApiOperation({ summary: 'Mark a reminder as sent (called by whatever actually delivered it)' })
  @Post(':id/mark-sent')
  markSent(@Param('id') id: string) {
    return this.remindersService.markSent(id);
  }
}
