import { Injectable } from '@nestjs/common';
import {
  financialWeekBounds,
  moneyDifference,
} from '../../../../shared/finance/financial-period';
import {
  DailyBreakdown,
  IInsightsRepository,
  PeriodSummaryData,
} from '../../domain/ports/insights.repository';

export interface GetWeekSummaryQuery {
  userId: string;
  year: number;
  week: number;
}

export type WeekSummaryResult = PeriodSummaryData & {
  netBalance: number;
  dailyBreakdown: DailyBreakdown[];
};

@Injectable()
export class GetWeekSummaryUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GetWeekSummaryQuery): Promise<WeekSummaryResult> {
    const { userId, year, week } = query;
    const { from, to } = financialWeekBounds(year, week);

    const [data, dailyBreakdown] = await Promise.all([
      this.repo.getPeriodSummary({ userId, from, to }),
      this.repo.getDailyBreakdown({ userId, from, to }),
    ]);

    return {
      ...data,
      netBalance: moneyDifference(data.totalIncome, data.totalExpense),
      dailyBreakdown,
    };
  }
}
