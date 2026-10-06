import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { FollowUpReminderService } from '../notifications/follow-up-reminder.service.js';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly followUpReminderService: FollowUpReminderService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('reminders/daily')
  async processDailyReminders(@Headers('x-cron-secret') cronSecret: string) {
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      throw new UnauthorizedException();
    }

    return this.followUpReminderService.processDailyReminders();
  }
}
