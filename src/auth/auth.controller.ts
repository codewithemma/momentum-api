import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/auth.decorator.js';
import { NextjsGoogleLoginDto } from './dto/google-login.dto.js';
import { RefreshTokenDto } from './dto/auth.dto.js';
import { type AuthenticatedRequest } from '../common/types/common.types.js';
import { CompleteOnboardingDto } from './dto/onboarding.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Nextjs google login
  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 15 * 60 * 1000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('google-login')
  nextjsGoogleLogin(@Body() nextjsGoogleLoginDto: NextjsGoogleLoginDto) {
    return this.authService.validateOrCreateGoogleUser(nextjsGoogleLoginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('complete-onboarding')
  completeOnboarding(
    @Req() req: AuthenticatedRequest,
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ) {
    return this.authService.completeOnboarding(
      req?.user?.id,
      completeOnboardingDto,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
