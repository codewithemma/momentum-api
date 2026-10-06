import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadSource } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateName(userId: string, name: string) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Name cannot be empty');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: trimmedName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
  }

  async updateDefaultLeadSource(
    userId: string,
    defaultLeadSource: LeadSource | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultLeadSource,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        defaultLeadSource: true,
      },
    });
  }
}
