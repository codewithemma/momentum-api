import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { FollowUpReminderService } from './follow-up-reminder.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FollowUpReminderService,
    PrismaService,
    MailService,
  ],
  exports: [NotificationsService, FollowUpReminderService],
})
export class NotificationsModule {}
