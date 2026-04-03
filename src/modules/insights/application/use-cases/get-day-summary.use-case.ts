import { Injectable } from '@nestjs/common';
import { IInsightsRepository, PeriodSummaryData } from '../../domain/ports/insights.repository';

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
    const [year, month, day] = date.split('-').map(Number);

    const from = new Date(year, month - 1, day, 0, 0, 0, 0);
    const to = new Date(year, month - 1, day, 23, 59, 59, 999);

    const data = await this.repo.getPeriodSummary({ userId, from, to });

    return {
      ...data,
      netBalance: data.totalIncome - data.totalExpense,
    };
  }
}
