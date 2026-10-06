import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

@Injectable()
export class FollowUpReminderService {
  private readonly logger = new Logger(FollowUpReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processDailyReminders() {
    const { startOfDay, startOfNextDay } = this.getLagosDayBounds();

    this.logger.log(
      `Processing follow-up reminders for ${startOfDay.toISOString()}`,
    );

    const [dueFollowUps, overdueFollowUps] = await Promise.all([
      this.getDueFollowUps(startOfDay, startOfNextDay),
      this.getOverdueFollowUps(startOfDay),
    ]);

    let dueCreated = 0;
    let overdueCreated = 0;

    for (const lead of dueFollowUps) {
      const created = await this.createDueNotification(lead);

      if (created) {
        dueCreated++;
      }
    }

    for (const lead of overdueFollowUps) {
      const created = await this.createOverdueNotification(lead);

      if (created) {
        overdueCreated++;
      }
    }

    this.logger.log(
      `Reminder processing complete. Due: ${dueCreated}, Overdue: ${overdueCreated}`,
    );

    return {
      dueFound: dueFollowUps.length,
      overdueFound: overdueFollowUps.length,
      dueCreated,
      overdueCreated,
    };
  }

  private async getDueFollowUps(startOfDay: Date, startOfNextDay: Date) {
    return this.prisma.lead.findMany({
      where: {
        nextFollowUpAt: {
          gte: startOfDay,
          lt: startOfNextDay,
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        company: true,
        nextFollowUpAt: true,
      },
    });
  }

  private async getOverdueFollowUps(startOfDay: Date) {
    return this.prisma.lead.findMany({
      where: {
        nextFollowUpAt: {
          lt: startOfDay,
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        company: true,
        nextFollowUpAt: true,
      },
    });
  }

  private async createDueNotification(lead: {
    id: string;
    userId: string;
    name: string;
    company: string | null;
    nextFollowUpAt: Date | null;
  }) {
    if (!lead.nextFollowUpAt) {
      return false;
    }

    const followUpDate = this.formatLagosDate(lead.nextFollowUpAt);

    const dedupeKey = `FOLLOW_UP_DUE:${lead.id}:${followUpDate}`;

    try {
      await this.prisma.notification.create({
        data: {
          userId: lead.userId,
          leadId: lead.id,
          type: NotificationType.FOLLOW_UP_DUE,
          title: 'Follow-up due',
          message: `${lead.name} is due for follow-up today.`,
          dedupeKey,
        },
      });

      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async createOverdueNotification(lead: {
    id: string;
    userId: string;
    name: string;
    company: string | null;
    nextFollowUpAt: Date | null;
  }) {
    if (!lead.nextFollowUpAt) {
      return false;
    }

    const followUpDate = this.formatLagosDate(lead.nextFollowUpAt);

    const dedupeKey = `FOLLOW_UP_OVERDUE:${lead.id}:${followUpDate}`;

    try {
      await this.prisma.notification.create({
        data: {
          userId: lead.userId,
          leadId: lead.id,
          type: NotificationType.FOLLOW_UP_OVERDUE,
          title: 'Follow-up overdue',
          message: `${lead.name}'s follow-up is overdue.`,
          dedupeKey,
        },
      });

      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  private getLagosDayBounds() {
    const now = new Date();

    // Nigeria is UTC+1.
    const lagosNow = new Date(now.getTime() + 60 * 60 * 1000);

    const year = lagosNow.getUTCFullYear();
    const month = lagosNow.getUTCMonth();
    const day = lagosNow.getUTCDate();

    const startOfDay = new Date(
      Date.UTC(year, month, day, 0, 0, 0, 0) - 60 * 60 * 1000,
    );

    const startOfNextDay = new Date(
      Date.UTC(year, month, day + 1, 0, 0, 0, 0) - 60 * 60 * 1000,
    );

    return {
      startOfDay,
      startOfNextDay,
    };
  }

  private formatLagosDate(date: Date) {
    const lagosDate = new Date(date.getTime() + 60 * 60 * 1000);

    const year = lagosDate.getUTCFullYear();
    const month = String(lagosDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lagosDate.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
