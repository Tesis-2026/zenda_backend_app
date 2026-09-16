import { Injectable } from '@nestjs/common';
import {
  financialDayBounds,
  moneyDifference,
} from '../../../../shared/finance/financial-period';
import {
  IInsightsRepository,
  PeriodSummaryData,
} from '../../domain/ports/insights.repository';

export interface GetDaySummaryQuery {
  userId: string;
  date: string; // ISO 8601 date string: YYYY-MM-DD
}

export type DaySummaryResult = PeriodSummaryData & { netBalance: number };

@Injectable()
export class GetDaySummaryUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GetDaySummaryQuery): Promise<DaySummaryResult> {
    const { userId, date } = query;
    const { from, to } = financialDayBounds(date);

    const data = await this.repo.getPeriodSummary({ userId, from, to });

    return {
      ...data,
      netBalance: moneyDifference(data.totalIncome, data.totalExpense),
    };
  }
}
