import { Inject, Injectable } from '@nestjs/common';
import { IBudgetRepository } from '../domain/ports/budget.repository';

export interface BudgetSnapshot {
  budgetId: string;
  categoryName: string | null;
  amountLimit: number;
  currentSpent: number;
  percentageUsed: number;
}

/**
 * Read-only facade exposed to other bounded contexts (Transactions) so they
 * can ask "what's the current state of the user's budget for this category?"
 * without importing the internal repository port directly. Follows the B19
 * facade pattern (BadgesFacade / ChallengesFacade / CategoriesFacade).
 */
export abstract class BudgetsFacade {
  abstract getSnapshotForCategory(
    userId: string,
    categoryId: string,
    occurredAt: Date,
  ): Promise<BudgetSnapshot | null>;

  /** All of the user's budgets for a given month/year (used by PDF reports). */
  abstract listSnapshotsForPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetSnapshot[]>;
}

@Injectable()
export class BudgetsFacadeImpl extends BudgetsFacade {
  constructor(
    @Inject(IBudgetRepository)
    private readonly repo: IBudgetRepository,
  ) {
    super();
  }

  async getSnapshotForCategory(
    userId: string,
    categoryId: string,
    occurredAt: Date,
  ): Promise<BudgetSnapshot | null> {
    const month = occurredAt.getMonth() + 1;
    const year = occurredAt.getFullYear();
    const budget = await this.repo.findForCategoryAndPeriod(userId, categoryId, month, year);
    if (!budget) return null;
    return {
      budgetId: budget.id,
      categoryName: budget.categoryName,
      amountLimit: budget.amountLimit,
      currentSpent: budget.currentSpent,
      percentageUsed: budget.percentageUsed,
    };
  }

  async listSnapshotsForPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetSnapshot[]> {
    const budgets = await this.repo.findAll({ userId, month, year });
    return budgets.map((b) => ({
      budgetId: b.id,
      categoryName: b.categoryName,
      amountLimit: b.amountLimit,
      currentSpent: b.currentSpent,
      percentageUsed: b.percentageUsed,
    }));
  }
}
