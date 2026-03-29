import { Injectable } from '@nestjs/common';
import { IInsightsRepository, MonthSummaryData } from '../../domain/ports/insights.repository';

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
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const data = await this.repo.getMonthSummary({ userId, year, month, from, to });

    return {
      ...data,
      netBalance: data.totalIncome - data.totalExpense,
    };
  }
}
