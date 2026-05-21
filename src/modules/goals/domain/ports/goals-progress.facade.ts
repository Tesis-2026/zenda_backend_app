/**
 * Anti-Corruption Layer facade for the Goals bounded context.
 *
 * Exposes a read-only, narrow view of goal progress for other contexts
 * (e.g. Insights) so they never reach into the goals persistence directly.
 */
export interface GoalProgressSnapshot {
  name: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
}

export abstract class IGoalsProgressFacade {
  abstract getGoalsProgress(userId: string): Promise<GoalProgressSnapshot[]>;
}
