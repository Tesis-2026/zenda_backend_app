import { Injectable } from '@nestjs/common';
import {
  financialMonthBounds,
  moneyDifference,
} from '../../../../shared/finance/financial-period';
import {
  IInsightsRepository,
  MonthSummaryData,
} from '../../domain/ports/insights.repository';

export interface GetMonthSummaryQuery {
  userId: string;
  year: number;
  month: number;
}

export type MonthSummaryResult = MonthSummaryData & { netBalance: number };

@Injectable()
export class GetMonthSummaryUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GetMonthSummaryQuery): Promise<MonthSummaryResult> {
    const { userId, year, month } = query;
    const { from, to } = financialMonthBounds(year, month);

    const data = await this.repo.getMonthSummary({
      userId,
      year,
      month,
      from,
      to,
    });

    return {
      ...data,
      netBalance: moneyDifference(data.totalIncome, data.totalExpense),
    };
  }
}
