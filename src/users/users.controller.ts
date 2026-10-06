import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest } from '../common/types/common.types.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @HttpCode(HttpStatus.OK)
  @Patch('me')
  async updateName(
    @Req() req: AuthenticatedRequest,
    @Body('name') name: string,
  ) {
    return this.usersService.updateName(req?.user?.id, name);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('me/default-lead-source')
  async updateDefaultLeadSource(
    @Req() req: AuthenticatedRequest,
    @Body('defaultLeadSource') defaultLeadSource: any,
  ) {
    return this.usersService.updateDefaultLeadSource(
      req?.user?.id,
      defaultLeadSource,
    );
  }
}
