import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IInsightsRepository } from './domain/ports/insights.repository';
import { PrismaInsightsRepository } from './infrastructure/persistence/prisma-insights.repository';
import { GetMonthSummaryUseCase } from './application/use-cases/get-month-summary.use-case';
import { GetWeekSummaryUseCase } from './application/use-cases/get-week-summary.use-case';
import { GetDaySummaryUseCase } from './application/use-cases/get-day-summary.use-case';
import { GetMonthComparisonUseCase } from './application/use-cases/get-month-comparison.use-case';
import { GeneratePdfReportUseCase } from './application/use-cases/generate-pdf-report.use-case';
import { SummaryController } from './interface/summary.controller';
import { ReportsController } from './interface/reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SummaryController, ReportsController],
  providers: [
    { provide: IInsightsRepository, useClass: PrismaInsightsRepository },
    GetMonthSummaryUseCase,
    GetWeekSummaryUseCase,
    GetDaySummaryUseCase,
    GetMonthComparisonUseCase,
    GeneratePdfReportUseCase,
  ],
})
export class InsightsModule {}
