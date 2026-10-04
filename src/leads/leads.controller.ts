import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { type AuthenticatedRequest } from '../common/types/common.types.js';
import { GetLeadsDto } from './dto/get-leads.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('/create')
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    return this.leadsService.create(req?.user?.id, createLeadDto);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: GetLeadsDto) {
    return this.leadsService.findAll(req?.user?.id, query);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.leadsService.findOne(req?.user?.id, id);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  updateLead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(req.user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteLead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.leadsService.remove(req.user.id, id);
  }
}
