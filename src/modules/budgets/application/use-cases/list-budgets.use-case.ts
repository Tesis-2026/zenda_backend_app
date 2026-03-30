import { Injectable } from '@nestjs/common';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';

export interface ListBudgetsQuery {
  userId: string;
  month?: number;
  year?: number;
}

@Injectable()
export class ListBudgetsUseCase {
  constructor(private readonly repo: IBudgetRepository) {}

  execute(query: ListBudgetsQuery): Promise<BudgetEntity[]> {
    return this.repo.findAll({
      userId: query.userId,
      month: query.month,
      year: query.year,
    });
  }
}
