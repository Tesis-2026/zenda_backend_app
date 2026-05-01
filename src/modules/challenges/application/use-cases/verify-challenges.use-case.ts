import { Injectable } from '@nestjs/common';
import { UserChallengeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IChallengeRepository } from '../../domain/ports/challenge.repository';

type CriteriaJson =
  | { type: 'daily_recording_streak'; durationDays: number }
  | { type: 'savings_goal_contribution'; minimumAmount: number; periodDays: number }
  | { type: 'no_transactions_category'; categoryName: string; durationDays: number }
  | { type: 'category_reduction_percentage'; categoryName: string; reductionPercent: number };

@Injectable()
export class VerifyChallengesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeRepo: IChallengeRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const activeUserChallenges = await this.prisma.userChallenge.findMany({
      where: { userId, status: UserChallengeStatus.ACTIVE },
      include: { challenge: true },
    });

    const completed: string[] = [];
    await Promise.all(
      activeUserChallenges.map(async (uc) => {
        const criteria = uc.challenge.criteriaJson as CriteriaJson;
        const met = await this.isCriteriaMet(userId, criteria);
        if (met) {
          await this.challengeRepo.complete(uc.challengeId, userId);
          completed.push(uc.challenge.title);
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

        const txs = await this.prisma.transaction.findMany({
          where: { userId, deletedAt: null, occurredAt: { gte: from, lte: today } },
          select: { occurredAt: true },
        });

        const daysWithTx = new Set(txs.map((t) => t.occurredAt.toISOString().slice(0, 10)));
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

        const goals = await this.prisma.savingsGoal.findMany({
          where: { userId, deletedAt: null },
          select: { id: true },
        });
        const goalIds = goals.map((g) => g.id);
        if (goalIds.length === 0) return false;

        const agg = await this.prisma.goalContribution.aggregate({
          where: { goalId: { in: goalIds }, createdAt: { gte: from } },
          _sum: { amount: true },
        });

        const total = (agg._sum.amount ?? new Decimal(0)).toNumber();
        return total >= minimumAmount;
      }

      default:
        return false;
    }
  }
}
