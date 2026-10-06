import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { type AuthenticatedRequest } from '../common/types/common.types.js';
import { NotificationsService } from './notifications.service.js';
import { FollowUpReminderService } from './follow-up-reminder.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findAll(req?.user?.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('unread-count')
  getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req?.user?.id);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(req?.user?.id, notificationId);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('read-all')
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req?.user?.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.remove(req?.user?.id, notificationId);
  }
}
