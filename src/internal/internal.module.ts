import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller.js';
import { FollowUpReminderService } from '../notifications/follow-up-reminder.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [InternalController],
  providers: [FollowUpReminderService, PrismaService],
})
export class InternalModule {}
