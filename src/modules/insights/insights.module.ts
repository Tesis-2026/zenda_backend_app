import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { GetMonthSummaryUseCase } from './application/use-cases/get-month-summary.use-case';
import { SummaryController } from './interface/summary.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SummaryController],
  providers: [GetMonthSummaryUseCase],
})
export class InsightsModule {}
