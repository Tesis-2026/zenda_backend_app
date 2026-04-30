import { Injectable } from '@nestjs/common';
import { IBadgeRepository } from '../../../badges/domain/ports/badge.repository';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';

export interface ListBudgetsQuery {
  userId: string;
  month?: number;
  year?: number;
}

@Injectable()
export class ListBudgetsUseCase {
  constructor(
    private readonly repo: IBudgetRepository,
    private readonly badgeRepo: IBadgeRepository,
  ) {}

  async execute(query: ListBudgetsQuery): Promise<BudgetEntity[]> {
    const budgets = await this.repo.findAll({
      userId: query.userId,
      month: query.month,
      year: query.year,
    });

    // Award Budgeter badge when viewing a completed past month where all budgets were adhered to
    const now = new Date();
    const viewMonth = query.month ?? now.getMonth() + 1;
    const viewYear = query.year ?? now.getFullYear();
    const isPastMonth =
      viewYear < now.getFullYear() ||
      (viewYear === now.getFullYear() && viewMonth < now.getMonth() + 1);

    if (
      isPastMonth &&
      budgets.length > 0 &&
      budgets.every((b) => b.percentageUsed <= 100)
    ) {
      await this.badgeRepo.awardIfNotEarned(query.userId, 'Budgeter');
    }

    return budgets;
  }
}
