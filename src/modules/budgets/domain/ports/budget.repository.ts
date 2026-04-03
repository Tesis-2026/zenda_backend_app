import { BudgetEntity } from '../budget.entity';

export abstract class IBudgetRepository {
  abstract create(params: {
    userId: string;
    categoryId?: string;
    amountLimit: number;
    month: number;
    year: number;
  }): Promise<BudgetEntity>;

  abstract findAll(params: {
    userId: string;
    month?: number;
    year?: number;
  }): Promise<BudgetEntity[]>;

  abstract findById(id: string, userId: string): Promise<BudgetEntity | null>;

  abstract update(
    id: string,
    userId: string,
    params: { amountLimit: number },
  ): Promise<BudgetEntity>;

  abstract softDelete(id: string, userId: string): Promise<void>;

  /**
   * Returns the active global budget (categoryId = null) for the given user/period.
   * PostgreSQL unique constraints treat NULL as distinct, so this application-level
   * check is the only reliable guard against duplicate global budgets.
   */
  abstract findGlobalForPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetEntity | null>;
}
