/**
 * Data needs of VerifyChallengesUseCase, expressed as semantic queries so the
 * application layer never reaches into Prisma directly. The implementation
 * lives in infrastructure/persistence/prisma-challenge-verification.repository.ts.
 */

export interface ActiveUserChallenge {
  challengeId: string;
  title: string;
  criteria: unknown; // raw criteria_json; the use case narrows it with its own CriteriaJson union
}

export abstract class IChallengeVerificationPort {
  /**
   * Active = acceptedAt not null AND completedAt null (status is derived from
   * timestamps; there is no status column).
   */
  abstract listActiveUserChallenges(userId: string): Promise<ActiveUserChallenge[]>;

  /**
   * Returns the set of YYYY-MM-DD keys (in UTC) for which the user has at
   * least one non-deleted transaction within the inclusive [from, to] range.
   * Used by the daily-recording-streak criterion.
   */
  abstract listTransactionDayKeysUtc(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Set<string>>;

  /**
   * Sum of contributions to any of the user's non-deleted savings goals since
   * the given timestamp (createdAt >= since).
   */
  abstract sumGoalContributionsSince(userId: string, since: Date): Promise<number>;

  /**
   * Case-insensitive lookup of a non-deleted category by name. Returns null
   * when the category does not exist.
   */
  abstract findCategoryIdByName(name: string): Promise<string | null>;

  /**
   * Count of non-deleted transactions for (userId, categoryId) with
   * occurredAt >= since.
   */
  abstract countTransactionsForCategorySince(
    userId: string,
    categoryId: string,
    since: Date,
  ): Promise<number>;

  /**
   * Sum of non-deleted transaction amounts for (userId, categoryId) with
   * occurredAt in [from, to). Returns 0 when no rows match.
   */
  abstract sumTransactionAmountForCategoryInRange(
    userId: string,
    categoryId: string,
    from: Date,
    to?: Date,
  ): Promise<number>;
}
