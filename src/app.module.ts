import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guards/auth.guard.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EmailVerifiedGuard } from './auth/guards/verify-email.guard.js';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { InternalModule } from './internal/internal.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    // BullModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     connection:
    //       config.get('NODE_ENV') === 'production'
    //         ? {
    //             url: config.getOrThrow<string>('REDIS_URL'),
    //           }
    //         : {
    //             host: 'localhost',
    //             port: 6379,
    //           },
    //   }),
    // }),
    AuthModule,
    PrismaModule,
    RedisModule,
    LeadsModule,
    DashboardModule,
    NotificationsModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    // {
    //   provide: APP_FILTER,
    //   useClass: SentryGlobalFilter,
    // },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
  ],
})
export class AppModule {}
