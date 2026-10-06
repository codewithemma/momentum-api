import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      updated: result.count,
    };
  }

  async remove(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: {
        id: notification.id,
      },
    });

    return {
      message: 'Notification deleted successfully',
    };
  }

  async create(data: {
    userId: string;
    leadId?: string;
    dedupeKey?: string;
    type: 'FOLLOW_UP_DUE' | 'FOLLOW_UP_OVERDUE';
    title: string;
    message: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        leadId: data.leadId,
        dedupeKey:
          data.dedupeKey ??
          `${data.userId}:${data.leadId ?? 'none'}:${data.type}:${Date.now()}`,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });
  }
}
