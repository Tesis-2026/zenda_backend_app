import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ActiveUserChallenge,
  IChallengeVerificationPort,
} from '../../domain/ports/challenge-verification.port';

@Injectable()
export class PrismaChallengeVerificationRepository
  implements IChallengeVerificationPort
{
  constructor(private readonly prisma: PrismaService) {}

  async listActiveUserChallenges(userId: string): Promise<ActiveUserChallenge[]> {
    const rows = await this.prisma.userChallenge.findMany({
      where: { userId, acceptedAt: { not: null }, completedAt: null },
      include: { challenge: true },
    });
    return rows.map((uc) => ({
      challengeId: uc.challengeId,
      title: uc.challenge.title,
      criteria: uc.challenge.criteriaJson,
    }));
  }

  async listTransactionDayKeysUtc(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Set<string>> {
    const txs = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, occurredAt: { gte: from, lte: to } },
      select: { occurredAt: true },
    });
    return new Set(txs.map((t) => t.occurredAt.toISOString().slice(0, 10)));
  }

  async sumGoalContributionsSince(userId: string, since: Date): Promise<number> {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const goalIds = goals.map((g) => g.id);
    if (goalIds.length === 0) return 0;

    const agg = await this.prisma.goalContribution.aggregate({
      where: { goalId: { in: goalIds }, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    return (agg._sum.amount ?? new Decimal(0)).toNumber();
  }

  async findCategoryIdByName(name: string): Promise<string | null> {
    const category = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    return category?.id ?? null;
  }

  async countTransactionsForCategorySince(
    userId: string,
    categoryId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.transaction.count({
      where: {
        userId,
        categoryId,
        deletedAt: null,
        occurredAt: { gte: since },
      },
    });
  }

  async sumTransactionAmountForCategoryInRange(
    userId: string,
    categoryId: string,
    from: Date,
    to?: Date,
  ): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        deletedAt: null,
        occurredAt: { gte: from, ...(to !== undefined ? { lt: to } : {}) },
      },
      _sum: { amount: true },
    });
    return (agg._sum.amount ?? new Decimal(0)).toNumber();
  }
}
