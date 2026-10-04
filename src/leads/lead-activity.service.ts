import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityType } from '../generated/prisma/enums.js';

@Injectable()
export class LeadActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const activities = await this.prisma.leadActivity.findMany({
      where: {
        leadId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      activities,
    };
  }

  async create(userId: string, leadId: string, dto: CreateLeadActivityDto) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const systemActivityTypes: ActivityType[] = [
      ActivityType.LEAD_CREATED,
      ActivityType.STATUS_CHANGED,
      ActivityType.FOLLOW_UP_SCHEDULED,
      ActivityType.FOLLOW_UP_UPDATED,
      ActivityType.FOLLOW_UP_CLEARED,
    ];

    if (systemActivityTypes.includes(dto.type)) {
      throw new BadRequestException(
        'This activity type is created automatically',
      );
    }

    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
      },
    });

    return {
      message: 'Activity added successfully',
      activity,
    };
  }

  async createSystemActivity(
    leadId: string,
    type: ActivityType,
    title: string,
    description?: string,
  ) {
    return this.prisma.leadActivity.create({
      data: {
        leadId,
        type,
        title,
        description,
      },
    });
  }
}
