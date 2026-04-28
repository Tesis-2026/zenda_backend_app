import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './shared/exceptions/global-exception.filter';
import { RequestLoggingInterceptor } from './shared/logger/request-logging.interceptor';
import configuration from './shared/config/configuration';
import { AppLogger } from './shared/logger/app-logger.service';
import { HealthController } from './health/health.controller';
import { AiModule } from './infra/ai/ai.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { InsightsModule } from './modules/insights/insights.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { EducationModule } from './modules/education/education.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { BadgesModule } from './modules/badges/badges.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AiModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
    GoalsModule,
    InsightsModule,
    PredictionsModule,
    RecommendationsModule,
    EducationModule,
    ChallengesModule,
    BadgesModule,
    FeedbackModule,
    SurveysModule,
    NotificationsModule,
    ChatModule,
  ],
  controllers: [HealthController],
  providers: [
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
