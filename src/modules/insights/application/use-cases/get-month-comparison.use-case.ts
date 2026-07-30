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
      throw new BadRequestException('Se necesitan al menos 2 meses de datos para comparar');
    }
    return this.repo.getMonthComparison(userId, months);
  }
}
