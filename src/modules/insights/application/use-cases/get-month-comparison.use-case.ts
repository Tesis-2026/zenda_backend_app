import { BadRequestException, Injectable } from '@nestjs/common';
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
    if (months < 2) {
      throw new BadRequestException('At least 2 months of data are required for comparison');
    }
    return this.repo.getMonthComparison(userId, months);
  }
}
