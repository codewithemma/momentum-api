import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service.js';
import { NextjsGoogleLoginDto } from './dto/google-login.dto.js';
import { GoogleTokenPayload } from '../common/types/common.types.js';
import { RedisService } from '../redis/redis.service.js';
import { User } from '../generated/prisma/client.js';
import { CompleteOnboardingDto } from './dto/onboarding.dto.js';

const REFRESH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    // private mail: MailService,
    private readonly redis: RedisService,
  ) {}

  private readonly REFRESH_LOCK_TTL = 10;
  private readonly REFRESH_RESULT_TTL = 5;

  private readonly client = new OAuth2Client(process.env.AUTH_GOOGLE_ID!);

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    console.log(userId, 'userid');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isOnboarded: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isOnboarded) {
      throw new BadRequestException('Onboarding has already been completed');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role,
        clientSources: dto.clientSources,
        referralSource: dto.referralSource,
        isOnboarded: true,
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        clientSources: true,
        referralSource: true,
        isOnboarded: true,
        onboardingCompletedAt: true,
      },
    });

    return {
      message: 'Onboarding completed successfully',
      user: updatedUser,
    };
  }

  async validateOrCreateGoogleUser(nextjsGoogleLoginDto: NextjsGoogleLoginDto) {
    const { idToken } = nextjsGoogleLoginDto;
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await this.createNewGoogleUserTransaction(
        payload as GoogleTokenPayload,
      );
    }

    return this.generateAuthResponse(user);
  }

  private async generateTokens(userId: string, refreshExpiresAt: Date) {
    const payload = {
      sub: userId,
    };

    const accessToken = await this.jwt.signAsync(payload);

    // How much time is actually left in the 7-day session?
    const remainingSeconds = Math.floor(
      (refreshExpiresAt.getTime() - Date.now()) / 1000,
    );

    if (remainingSeconds <= 0) {
      throw new UnauthorizedException('Refresh session has expired');
    }

    // Refresh token expires at the existing absolute deadline
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: remainingSeconds,
    });

    const tokenHash = this.hashRefreshToken(refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAuthResponse(user: User) {
    // 1. If you add 2FA later, you'll just check: if (user.mfaEnabled) { return tempToken } here.

    const refreshExpiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_MS);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      refreshExpiresAt,
    );

    return {
      accessToken,
      refreshToken,
      user,
      message:
        'Google authentication successful. You can now close this window and return to the app.',
    };
  }

  private async createNewGoogleUserTransaction(dto: GoogleTokenPayload) {
    return this.prisma.user.create({
      data: {
        name: dto.name ?? 'Google User',
        email: dto.email,
        googleId: dto.sub,
        isEmailVerified: dto.email_verified,
        image: dto.picture,
      },
    });
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };

    try {
      payload = await this.jwt.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    // Check whether another request already refreshed this token.
    const existingResult = await this.getRefreshResult(tokenHash);

    if (existingResult) {
      return existingResult;
    }

    const lockId = crypto.randomUUID();

    const acquired = await this.acquireRefreshLock(tokenHash, lockId);

    if (!acquired) {
      // Another request is currently refreshing this token.
      // Wait briefly for its result to appear in Redis.

      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const result = await this.getRefreshResult(tokenHash);

        if (result) {
          return result;
        }
      }

      throw new UnauthorizedException('Refresh request is already in progress');
    }

    try {
      // Check again after acquiring the lock.
      //
      // Another request could have completed the refresh
      // immediately before we acquired the lock.
      const resultAfterLock = await this.getRefreshResult(tokenHash);

      if (resultAfterLock) {
        return resultAfterLock;
      }

      const session = await this.prisma.refreshSession.findUnique({
        where: { tokenHash },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      if (session.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Rotate the current refresh token.
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
        },
      });

      const tokens = await this.generateTokens(
        session.userId,
        session.expiresAt,
      );

      // Store the result BEFORE releasing the lock.
      await this.setRefreshResult(tokenHash, tokens);

      return tokens;
    } finally {
      await this.releaseRefreshLock(tokenHash, lockId);
    }
  }

  private async acquireRefreshLock(
    tokenHash: string,
    lockId: string,
  ): Promise<boolean> {
    const redis = this.redis.getClient();

    const result = await redis.set(
      `auth:refresh:lock:${tokenHash}`,
      lockId,
      'EX',
      this.REFRESH_LOCK_TTL,
      'NX',
    );

    return result === 'OK';
  }

  private async releaseRefreshLock(
    tokenHash: string,
    lockId: string,
  ): Promise<void> {
    const redis = this.redis.getClient();

    const lockKey = `auth:refresh:lock:${tokenHash}`;

    await redis.eval(
      `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `,
      1,
      lockKey,
      lockId,
    );
  }

  private async getRefreshResult(tokenHash: string) {
    const redis = this.redis.getClient();

    const result = await redis.get(`auth:refresh:result:${tokenHash}`);

    if (!result) {
      return null;
    }

    return JSON.parse(result) as {
      accessToken: string;
      refreshToken: string;
    };
  }

  private async setRefreshResult(
    tokenHash: string,
    result: {
      accessToken: string;
      refreshToken: string;
    },
  ) {
    const redis = this.redis.getClient();

    await redis.set(
      `auth:refresh:result:${tokenHash}`,
      JSON.stringify(result),
      'EX',
      this.REFRESH_RESULT_TTL,
    );
  }

  private hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
