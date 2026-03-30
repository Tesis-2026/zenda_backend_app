import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { IInsightsRepository } from './domain/ports/insights.repository';
import { PrismaInsightsRepository } from './infrastructure/persistence/prisma-insights.repository';
import { GetMonthSummaryUseCase } from './application/use-cases/get-month-summary.use-case';
import { SummaryController } from './interface/summary.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SummaryController],
  providers: [
    { provide: IInsightsRepository, useClass: PrismaInsightsRepository },
    GetMonthSummaryUseCase,
  ],
})
export class InsightsModule {}
