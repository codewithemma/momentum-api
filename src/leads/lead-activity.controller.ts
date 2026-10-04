import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { LeadActivityService } from './lead-activity.service.js';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto.js';
import { type AuthenticatedRequest } from '../common/types/common.types.js';

@Controller('leads/:leadId/activities')
export class LeadActivityController {
  constructor(private readonly leadActivityService: LeadActivityService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Param('leadId') leadId: string) {
    return this.leadActivityService.findAll(req.user.id, leadId);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('leadId') leadId: string,
    @Body() dto: CreateLeadActivityDto,
  ) {
    return this.leadActivityService.create(req.user.id, leadId, dto);
  }
}
