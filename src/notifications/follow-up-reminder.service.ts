import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

type ReminderLead = {
  id: string;
  userId: string;
  name: string;
  company: string | null;
  nextFollowUpAt: Date | null;
};

@Injectable()
export class FollowUpReminderService {
  private readonly logger = new Logger(FollowUpReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async processDailyReminders() {
    const { startOfDay, startOfNextDay } = this.getLagosDayBounds();

    this.logger.log(
      `Processing follow-up reminders for ${this.formatLagosDate(startOfDay)}`,
    );

    const [dueFollowUps, overdueFollowUps] = await Promise.all([
      this.getDueFollowUps(startOfDay, startOfNextDay),
      this.getOverdueFollowUps(startOfDay),
    ]);

    const createdDue = await this.createDueNotifications(dueFollowUps);

    const createdOverdue =
      await this.createOverdueNotifications(overdueFollowUps);

    // ONLY send emails for reminders that were actually created
    await this.sendReminderEmails(createdDue, createdOverdue);

    this.logger.log(
      `Reminder processing complete. Due found: ${dueFollowUps.length}, ` +
        `overdue found: ${overdueFollowUps.length}, ` +
        `due notifications created: ${createdDue.length}, ` +
        `overdue notifications created: ${createdOverdue.length}`,
    );

    return {
      dueFound: dueFollowUps.length,
      overdueFound: overdueFollowUps.length,
      dueCreated: createdDue.length,
      overdueCreated: createdOverdue.length,
    };
  }

  private async getDueFollowUps(
    startOfDay: Date,
    startOfNextDay: Date,
  ): Promise<ReminderLead[]> {
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

  private async getOverdueFollowUps(startOfDay: Date): Promise<ReminderLead[]> {
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

  private async createDueNotifications(
    leads: ReminderLead[],
  ): Promise<ReminderLead[]> {
    const created: ReminderLead[] = [];

    for (const lead of leads) {
      if (!lead.nextFollowUpAt) continue;

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

        created.push(lead);
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    return created;
  }

  private async createOverdueNotifications(
    leads: ReminderLead[],
  ): Promise<ReminderLead[]> {
    const created: ReminderLead[] = [];

    for (const lead of leads) {
      if (!lead.nextFollowUpAt) continue;

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

        created.push(lead);
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    return created;
  }

  private async sendReminderEmails(
    dueFollowUps: ReminderLead[],
    overdueFollowUps: ReminderLead[],
  ) {
    const remindersByUser = new Map<
      string,
      {
        dueToday: ReminderLead[];
        overdue: ReminderLead[];
      }
    >();

    for (const lead of dueFollowUps) {
      if (!remindersByUser.has(lead.userId)) {
        remindersByUser.set(lead.userId, {
          dueToday: [],
          overdue: [],
        });
      }

      remindersByUser.get(lead.userId)!.dueToday.push(lead);
    }

    for (const lead of overdueFollowUps) {
      if (!remindersByUser.has(lead.userId)) {
        remindersByUser.set(lead.userId, {
          dueToday: [],
          overdue: [],
        });
      }

      remindersByUser.get(lead.userId)!.overdue.push(lead);
    }

    const userIds = [...remindersByUser.keys()];

    if (userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    for (const user of users) {
      if (!user.email) {
        continue;
      }

      const reminders = remindersByUser.get(user.id);

      if (!reminders) {
        continue;
      }

      try {
        await this.mailService.sendFollowUpReminderEmail({
          email: user.email,
          dueToday: reminders.dueToday.map((lead) => ({
            id: lead.id,
            name: lead.name,
            company: lead.company,
          })),
          overdue: reminders.overdue.map((lead) => ({
            id: lead.id,
            name: lead.name,
            company: lead.company,
          })),
        });

        this.logger.log(`Follow-up reminder email sent to ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to send follow-up reminder email to ${user.email}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private getLagosDayBounds() {
    const now = new Date();

    // Africa/Lagos is UTC+1.
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
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
