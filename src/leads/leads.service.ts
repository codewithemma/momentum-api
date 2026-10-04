import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetLeadsDto } from './dto/get-leads.dto.js';
import { ActivityType } from '../generated/prisma/enums.js';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateLeadDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lead = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          userId,

          name: dto.name,
          company: dto.company,
          email: dto.email,
          phone: dto.phone,
          website: dto.website,
          industry: dto.industry,
          source: dto.source,
          notes: dto.notes,

          nextFollowUpAt: dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : undefined,
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: ActivityType.LEAD_CREATED,
          title: 'Lead created',
          description: 'You added this lead',
        },
      });

      if (dto.nextFollowUpAt) {
        const followUpDate = new Date(dto.nextFollowUpAt);

        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: ActivityType.FOLLOW_UP_SCHEDULED,
            title: 'Follow-up scheduled',
            description: `Follow-up scheduled for ${followUpDate.toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              },
            )}`,
          },
        });
      }

      return lead;
    });

    return {
      message: 'Lead created successfully',
      lead,
    };
  }

  async findAll(userId: string, query: GetLeadsDto) {
    const { search, source, page = 1, limit = 20 } = query;

    const skip = (page - 1) * limit;

    const where = {
      userId,

      ...(source ? { source } : {}),

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                company: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.lead.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(userId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        userId,
      },
      include: {
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return {
      lead,
    };
  }

  async update(userId: string, leadId: string, dto: UpdateLeadDto) {
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        userId,
      },
    });

    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: {
          id: leadId,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name,
          }),

          ...(dto.company !== undefined && {
            company: dto.company,
          }),

          ...(dto.email !== undefined && {
            email: dto.email,
          }),

          ...(dto.phone !== undefined && {
            phone: dto.phone,
          }),

          ...(dto.website !== undefined && {
            website: dto.website,
          }),

          ...(dto.industry !== undefined && {
            industry: dto.industry,
          }),

          ...(dto.source !== undefined && {
            source: dto.source,
          }),

          ...(dto.status !== undefined && {
            status: dto.status,
          }),

          ...(dto.notes !== undefined && {
            notes: dto.notes,
          }),

          ...(dto.nextFollowUpAt !== undefined && {
            nextFollowUpAt: dto.nextFollowUpAt
              ? new Date(dto.nextFollowUpAt)
              : null,
          }),
        },
      });

      /*
       * STATUS ACTIVITY
       */
      if (dto.status !== undefined && dto.status !== existingLead.status) {
        await tx.leadActivity.create({
          data: {
            leadId,
            type: ActivityType.STATUS_CHANGED,
            title: 'Status changed',
            description: `${existingLead.status} → ${dto.status}`,
          },
        });
      }

      /*
       * FOLLOW-UP ACTIVITY
       */
      if (dto.nextFollowUpAt !== undefined) {
        const oldDate = existingLead.nextFollowUpAt;
        const newDate = dto.nextFollowUpAt
          ? new Date(dto.nextFollowUpAt)
          : null;

        if (!oldDate && newDate) {
          await tx.leadActivity.create({
            data: {
              leadId,
              type: ActivityType.FOLLOW_UP_SCHEDULED,
              title: 'Follow-up scheduled',
              description: `Follow-up scheduled for ${newDate.toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )}`,
            },
          });
        } else if (oldDate && !newDate) {
          await tx.leadActivity.create({
            data: {
              leadId,
              type: ActivityType.FOLLOW_UP_CLEARED,
              title: 'Follow-up cleared',
              description: 'The scheduled follow-up was cleared',
            },
          });
        } else if (
          oldDate &&
          newDate &&
          oldDate.getTime() !== newDate.getTime()
        ) {
          await tx.leadActivity.create({
            data: {
              leadId,
              type: ActivityType.FOLLOW_UP_UPDATED,
              title: 'Follow-up updated',
              description: `Follow-up moved from ${oldDate.toLocaleDateString(
                'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                },
              )} to ${newDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`,
            },
          });
        }
      }

      return lead;
    });

    return {
      message: 'Lead updated successfully',
      lead: result,
    };
  }

  async remove(userId: string, leadId: string) {
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        userId,
      },
    });

    if (!existingLead) {
      throw new NotFoundException('Lead not found');
    }

    await this.prisma.lead.delete({
      where: {
        id: leadId,
      },
    });

    return {
      message: 'Lead deleted successfully',
    };
  }
}
