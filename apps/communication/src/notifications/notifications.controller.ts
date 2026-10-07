import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtVerifyGuard } from '@healthcare/shared';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ActorId } from '../common/actor.decorator';

@ApiTags('notifications')
@UseGuards(JwtVerifyGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({
    summary: 'Create and immediately (simulated-)send a notification',
    description:
      'No real SMS/email/push provider is integrated — see NotificationsService doc comments. This records ' +
      'the attempt and marks it sent so the pipeline (create -> send -> audit -> outbox) can be exercised ' +
      'end to end.',
  })
  @Post()
  create(@Body() dto: CreateNotificationDto, @ActorId() actorId: string) {
    return this.notificationsService.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Get a notification by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @ApiOperation({ summary: 'List notifications sent to a recipient' })
  @Get()
  listByRecipient(@Query('recipientId') recipientId: string) {
    return this.notificationsService.listByRecipient(recipientId);
  }
}
