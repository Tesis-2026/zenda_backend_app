import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './shared/audit/audit.module';
import { RequestContextInterceptor } from './shared/audit/request-context.interceptor';
import { GlobalExceptionFilter } from './shared/exceptions/global-exception.filter';
import { IdempotencyInterceptor } from './shared/idempotency/idempotency.interceptor';
import { IdempotencyModule } from './shared/idempotency/idempotency.module';
import { RequestLoggingInterceptor } from './shared/logger/request-logging.interceptor';
import configuration from './shared/config/configuration';
import { validateEnv } from './shared/config/env.validation';
import { AppLogger } from './shared/logger/app-logger.service';
import { HealthController } from './health/health.controller';
import { AiModule } from './infra/ai/ai.module';
import { AnalyticsModule } from './infra/analytics/analytics.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { InsightsModule } from './modules/insights/insights.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { EducationModule } from './modules/education/education.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FinancialProgressModule } from './modules/financial-progress/financial-progress.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuditModule,
    IdempotencyModule,
    AiModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
    GoalsModule,
    InsightsModule,
    PredictionsModule,
    RecommendationsModule,
    ConversationsModule,
    EducationModule,
    SurveysModule,
    FeedbackModule,
    FinancialProgressModule,
  ],
  controllers: [HealthController],
  providers: [
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      // Runs FIRST (NestJS executes APP_INTERCEPTORs in reverse
      // registration order). Populates the AsyncLocalStorage context
      // that AuditLogService reads.
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
