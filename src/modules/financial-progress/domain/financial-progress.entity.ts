export class FinancialProgressEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly period: string, // "YYYY-MM"
    readonly budgetComplianceScore: number | null,
    readonly savingsRatePct: number | null,
    readonly overspendCategoriesCount: number,
    readonly recommendationsShown: number,
    readonly recommendationsAccepted: number,
    readonly quizzesCompleted: number,
    readonly avgQuizScore: number | null,
    readonly createdAt: Date,
  ) {}

  /**
   * Acceptance rate of AI recommendations in this period.
   * Returns null when no recommendations were shown (avoids divide-by-zero
   * and a misleading "0% acceptance" when the user simply had no advice).
   */
  get recommendationAcceptanceRate(): number | null {
    if (this.recommendationsShown === 0) return null;
    return (this.recommendationsAccepted / this.recommendationsShown) * 100;
  }

  static create(params: {
    id: string;
    userId: string;
    period: string;
    budgetComplianceScore: number | null;
    savingsRatePct: number | null;
    overspendCategoriesCount: number;
    recommendationsShown: number;
    recommendationsAccepted: number;
    quizzesCompleted: number;
    avgQuizScore: number | null;
    createdAt: Date;
  }): FinancialProgressEntity {
    return new FinancialProgressEntity(
      params.id,
      params.userId,
      params.period,
      params.budgetComplianceScore,
      params.savingsRatePct,
      params.overspendCategoriesCount,
      params.recommendationsShown,
      params.recommendationsAccepted,
      params.quizzesCompleted,
      params.avgQuizScore,
      params.createdAt,
    );
  }
}
