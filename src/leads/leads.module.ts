import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadActivityController } from './lead-activity.controller.js';
import { LeadActivityService } from './lead-activity.service.js';

@Module({
  controllers: [LeadsController, LeadActivityController],
  providers: [LeadsService, LeadActivityService, PrismaService],
})
export class LeadsModule {}
