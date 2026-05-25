import { Injectable } from '@nestjs/common';
import { IChallengeRepository } from '../../domain/ports/challenge.repository';
import { IChallengeVerificationPort } from '../../domain/ports/challenge-verification.port';

type CriteriaJson =
  | { type: 'daily_recording_streak'; durationDays: number }
  | { type: 'savings_goal_contribution'; minimumAmount: number; periodDays: number }
  | { type: 'no_transactions_category'; categoryName: string; durationDays: number }
  | { type: 'category_reduction_percentage'; categoryName: string; reductionPercent: number };

@Injectable()
export class VerifyChallengesUseCase {
  constructor(
    private readonly verification: IChallengeVerificationPort,
    private readonly challengeRepo: IChallengeRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const active = await this.verification.listActiveUserChallenges(userId);

    const completed: string[] = [];
    await Promise.all(
      active.map(async (uc) => {
        const criteria = uc.criteria as CriteriaJson;
        const met = await this.isCriteriaMet(userId, criteria);
        if (met) {
          await this.challengeRepo.complete(uc.challengeId, userId);
          completed.push(uc.title);
        }
      }),
    );
    return completed;
  }

  private async isCriteriaMet(userId: string, criteria: CriteriaJson): Promise<boolean> {
    switch (criteria.type) {
      case 'daily_recording_streak': {
        const { durationDays } = criteria;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const from = new Date(today);
        from.setDate(today.getDate() - durationDays + 1);
        from.setHours(0, 0, 0, 0);

        const daysWithTx = await this.verification.listTransactionDayKeysUtc(
          userId,
          from,
          today,
        );
        for (let i = 0; i < durationDays; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (!daysWithTx.has(d.toISOString().slice(0, 10))) return false;
        }
        return true;
      }

      case 'savings_goal_contribution': {
        const { minimumAmount, periodDays } = criteria;
        const from = new Date();
        from.setDate(from.getDate() - periodDays);
        from.setHours(0, 0, 0, 0);

        const total = await this.verification.sumGoalContributionsSince(userId, from);
        return total >= minimumAmount;
      }

      case 'no_transactions_category': {
        const { categoryName, durationDays } = criteria;
        const from = new Date();
        from.setDate(from.getDate() - durationDays);
        from.setHours(0, 0, 0, 0);

        const categoryId = await this.verification.findCategoryIdByName(categoryName);
        if (categoryId === null) return true;

        const count = await this.verification.countTransactionsForCategorySince(
          userId,
          categoryId,
          from,
        );
        return count === 0;
      }

      case 'category_reduction_percentage': {
        const { categoryName, reductionPercent } = criteria;

        const categoryId = await this.verification.findCategoryIdByName(categoryName);
        if (categoryId === null) return false;

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [currTotal, prevTotal] = await Promise.all([
          this.verification.sumTransactionAmountForCategoryInRange(
            userId,
            categoryId,
            currentMonthStart,
          ),
          this.verification.sumTransactionAmountForCategoryInRange(
            userId,
            categoryId,
            prevMonthStart,
            currentMonthStart,
          ),
        ]);

        if (prevTotal === 0) return false;
        const reduction = ((prevTotal - currTotal) / prevTotal) * 100;
        return reduction >= reductionPercent;
      }

      default:
        return false;
    }
  }
}
