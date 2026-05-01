import { Injectable } from '@nestjs/common';
import { DailyBreakdown, IInsightsRepository, PeriodSummaryData } from '../../domain/ports/insights.repository';

export interface GetWeekSummaryQuery {
  userId: string;
  year: number;
  week: number;
}

export type WeekSummaryResult = PeriodSummaryData & {
  netBalance: number;
  dailyBreakdown: DailyBreakdown[];
};

function isoWeekBounds(year: number, week: number): { from: Date; to: Date } {
  // ISO week 1 is the week containing the first Thursday of the year.
  // Jan 4th is always in week 1.
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() === 0 ? 7 : jan4.getDay(); // Mon=1 … Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (dayOfWeek - 1));

  const from = new Date(week1Monday);
  from.setDate(week1Monday.getDate() + (week - 1) * 7);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

@Injectable()
export class GetWeekSummaryUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GetWeekSummaryQuery): Promise<WeekSummaryResult> {
    const { userId, year, week } = query;
    const { from, to } = isoWeekBounds(year, week);

    const [data, dailyBreakdown] = await Promise.all([
      this.repo.getPeriodSummary({ userId, from, to }),
      this.repo.getDailyBreakdown({ userId, from, to }),
    ]);

    return {
      ...data,
      netBalance: data.totalIncome - data.totalExpense,
      dailyBreakdown,
    };
  }
}
