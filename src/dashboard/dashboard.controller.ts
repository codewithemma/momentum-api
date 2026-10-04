import { Controller, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { type AuthenticatedRequest } from '../common/types/common.types.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @HttpCode(HttpStatus.OK)
  @Get('overview')
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getOverview(req.user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('recent-activities')
  getRecentActivities(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getRecentActivities(req.user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('pipeline')
  getPipeline(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getPipeline(req.user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('needs-attention')
  getNeedsAttention(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getNeedsAttention(req.user.id);
  }
}
