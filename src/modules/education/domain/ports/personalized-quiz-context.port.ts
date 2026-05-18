/**
 * Data needs of GetPersonalizedQuizUseCase, expressed as semantic queries so
 * the application layer never touches PrismaService directly. The shape
 * returned by listSpendingByMonth + getUserProfile is structurally
 * compatible with SpendingContext / UserProfile in infra/ai so the use case
 * can assemble the AI prompt without further translation.
 */

export interface PersonalizedQuizUserProfile {
  financialLiteracyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  age: number | null;
  university: string | null;
  incomeType: string | null;
  averageMonthlyIncome: number | null;
}

export interface PersonalizedQuizMonthlyTotals {
  period: string; // "YYYY-MM"
  totalIncome: number;
  totalExpenses: number;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    transactionCount: number;
  }>;
}

export abstract class IPersonalizedQuizContextPort {
  /**
   * Count of AnalyticsEvent rows with eventType='quiz_personalized' for the
   * user since today 00:00 local. Used to enforce the daily attempt limit.
   */
  abstract countQuizPersonalizedAttemptsToday(userId: string): Promise<number>;

  /**
   * Profile snapshot used to personalize the AI prompt.
   */
  abstract getUserProfile(
    userId: string,
  ): Promise<PersonalizedQuizUserProfile | null>;

  /**
   * Returns the user's spending broken down by month for the last
   * `monthsBack` months (oldest first or most-recent first — caller doesn't
   * depend on order, but the current implementation returns most-recent
   * first to match the original use-case behavior).
   */
  abstract listSpendingByMonth(
    userId: string,
    monthsBack: number,
  ): Promise<PersonalizedQuizMonthlyTotals[]>;
}
