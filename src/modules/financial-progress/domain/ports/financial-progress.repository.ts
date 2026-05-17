import { FinancialProgressEntity } from '../financial-progress.entity';

export interface UpsertFinancialProgressParams {
  userId: string;
  period: string;
  budgetComplianceScore?: number | null;
  savingsRatePct?: number | null;
  overspendCategoriesCount?: number;
  recommendationsShown?: number;
  recommendationsAccepted?: number;
  quizzesCompleted?: number;
  avgQuizScore?: number | null;
}

export abstract class IFinancialProgressRepository {
  /**
   * Returns the user's progress snapshots ordered by period ascending,
   * optionally bounded by an inclusive [from, to] period range.
   */
  abstract findByUser(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<FinancialProgressEntity[]>;

  abstract findByUserAndPeriod(
    userId: string,
    period: string,
  ): Promise<FinancialProgressEntity | null>;

  /**
   * Inserts or updates the snapshot for (userId, period). Used by the
   * monthly aggregation job; idempotent so a re-run for the same period
   * overwrites with the latest computed values.
   */
  abstract upsert(
    params: UpsertFinancialProgressParams,
  ): Promise<FinancialProgressEntity>;
}
