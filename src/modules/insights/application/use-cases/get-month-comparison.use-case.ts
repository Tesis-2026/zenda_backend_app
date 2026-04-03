import { Injectable } from '@nestjs/common';
import { IInsightsRepository, MonthComparisonEntry } from '../../domain/ports/insights.repository';

export interface GetMonthComparisonQuery {
  userId: string;
  months: number;
}

@Injectable()
export class GetMonthComparisonUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GetMonthComparisonQuery): Promise<MonthComparisonEntry[]> {
    const { userId, months } = query;
    return this.repo.getMonthComparison(userId, months);
  }
}
