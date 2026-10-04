import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadStatus } from '../generated/prisma/enums.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const now = new Date();

    const [totalLeads, activeLeads, followUpsDue, wonLeads] = await Promise.all(
      [
        // Total leads
        this.prisma.lead.count({
          where: {
            userId,
          },
        }),

        // Active leads
        this.prisma.lead.count({
          where: {
            userId,
            status: {
              notIn: [LeadStatus.WON, LeadStatus.LOST],
            },
          },
        }),

        // Follow-ups due
        this.prisma.lead.count({
          where: {
            userId,
            nextFollowUpAt: {
              lte: now,
            },
          },
        }),

        // Won leads
        this.prisma.lead.count({
          where: {
            userId,
            status: LeadStatus.WON,
          },
        }),
      ],
    );

    return {
      totalLeads,
      activeLeads,
      followUpsDue,
      won: wonLeads,
    };
  }

  async getRecentActivities(userId: string) {
    const activities = await this.prisma.leadActivity.findMany({
      where: {
        lead: {
          userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    return {
      activities,
    };
  }

  async getPipeline(userId: string) {
    const pipeline = await this.prisma.lead.groupBy({
      by: ['status'],
      where: {
        userId,
      },
      _count: {
        _all: true,
      },
    });

    const counts = new Map(
      pipeline.map((item) => [item.status, item._count._all]),
    );

    return {
      pipeline: Object.values(LeadStatus).map((status) => ({
        status,
        count: counts.get(status) ?? 0,
      })),
    };
  }

  async getNeedsAttention(userId: string) {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [overdue, dueToday, upcoming] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          userId,
          nextFollowUpAt: {
            lt: startOfToday,
          },
        },
        orderBy: {
          nextFollowUpAt: 'asc',
        },
        take: 5,
        select: {
          id: true,
          name: true,
          company: true,
          nextFollowUpAt: true,
        },
      }),

      this.prisma.lead.findMany({
        where: {
          userId,
          nextFollowUpAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        orderBy: {
          nextFollowUpAt: 'asc',
        },
        take: 5,
        select: {
          id: true,
          name: true,
          company: true,
          nextFollowUpAt: true,
        },
      }),

      this.prisma.lead.findMany({
        where: {
          userId,
          nextFollowUpAt: {
            gt: endOfToday,
          },
        },
        orderBy: {
          nextFollowUpAt: 'asc',
        },
        take: 5,
        select: {
          id: true,
          name: true,
          company: true,
          nextFollowUpAt: true,
        },
      }),
    ]);

    return {
      overdue: {
        count: overdue.length,
        leads: overdue,
      },
      dueToday: {
        count: dueToday.length,
        leads: dueToday,
      },
      upcoming: {
        count: upcoming.length,
        leads: upcoming,
      },
    };
  }
}
