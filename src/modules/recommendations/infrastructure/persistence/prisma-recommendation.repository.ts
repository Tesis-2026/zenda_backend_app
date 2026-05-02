import { Injectable, NotFoundException } from '@nestjs/common';
import { RecommendationType as PrismaRecType, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { SpendingContext, UserProfile } from '../../../../infra/ai/AiProvider';
import { RecommendationEntity } from '../../domain/recommendation.entity';
import { IRecommendationRepository } from '../../domain/ports/recommendation.repository';

@Injectable()
export class PrismaRecommendationRepository implements IRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(userId: string): Promise<RecommendationEntity[]> {
    const rows = await this.prisma.recommendation.findMany({
      where: { userId, isActive: true },
      include: { feedback: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) =>
      new RecommendationEntity(r.id, r.userId, r.type as RecommendationEntity['type'], r.message, r.suggestedAction, r.isActive, r.feedback?.accepted ?? null, r.createdAt),
    );
  }

  async replaceAll(
    userId: string,
    recs: Omit<RecommendationEntity, 'id' | 'createdAt' | 'feedbackAccepted'>[],
  ): Promise<RecommendationEntity[]> {
    // Deactivate old ones, then create fresh ones
    await this.prisma.recommendation.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    const created = await Promise.all(
      recs.map((r) =>
        this.prisma.recommendation.create({
          data: {
            userId: r.userId,
            type: r.type as PrismaRecType,
            message: r.message,
            suggestedAction: r.suggestedAction,
            isActive: true,
          },
          include: { feedback: true },
        }),
      ),
    );
    return created.map((r) => new RecommendationEntity(r.id, r.userId, r.type as RecommendationEntity['type'], r.message, r.suggestedAction, r.isActive, r.feedback?.accepted ?? null, r.createdAt));
  }

  async submitFeedback(id: string, userId: string, accepted: boolean): Promise<void> {
    const rec = await this.prisma.recommendation.findFirst({ where: { id, userId } });
    if (!rec) throw new NotFoundException('Recommendation not found');
    await this.prisma.recommendationFeedback.upsert({
      where: { recommendationId: id },
      create: { recommendationId: id, accepted },
      update: { accepted },
    });
  }

  async getStats(userId: string): Promise<{ total: number; accepted: number; acceptanceRate: number }> {
    const recs = await this.prisma.recommendation.findMany({
      where: { userId },
      include: { feedback: true },
    });
    const withFeedback = recs.filter((r) => r.feedback !== null);
    const accepted = withFeedback.filter((r) => r.feedback?.accepted === true).length;
    const total = withFeedback.length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) / 100 : 0;
    return { total, accepted, acceptanceRate };
  }

  async getSpendingContext(userId: string): Promise<SpendingContext> {
    const now = new Date();
    const months: SpendingContext['months'] = [];

    const userRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { financialLiteracyLevel: true, age: true, university: true, incomeType: true, averageMonthlyIncome: true },
    });
    const userProfile: UserProfile = {
      financialLiteracyLevel: (userRow?.financialLiteracyLevel as UserProfile['financialLiteracyLevel']) ?? null,
      age: userRow?.age ?? null,
      university: userRow?.university ?? null,
      incomeType: userRow?.incomeType ?? null,
      averageMonthlyIncome: userRow?.averageMonthlyIncome?.toNumber() ?? null,
    };

    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);
      const period = `${year}-${String(month).padStart(2, '0')}`;

      const [incomeAgg, expenseAgg, byCategory] = await Promise.all([
        this.prisma.transaction.aggregate({ where: { userId, type: TransactionType.INCOME, occurredAt: { gte: from, lte: to }, deletedAt: null }, _sum: { amount: true } }),
        this.prisma.transaction.aggregate({ where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null }, _sum: { amount: true } }),
        this.prisma.transaction.groupBy({ by: ['categoryId'], where: { userId, occurredAt: { gte: from, lte: to }, deletedAt: null }, _sum: { amount: true }, _count: { id: true } }),
      ]);

      const catIds = byCategory.map((c) => c.categoryId).filter((id): id is string => id !== null);
      const cats = await this.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } });
      const catMap = new Map(cats.map((c) => [c.id, c.name]));

      months.push({
        period,
        totalExpenses: (expenseAgg._sum.amount ?? new Decimal(0)).toNumber(),
        totalIncome: (incomeAgg._sum.amount ?? new Decimal(0)).toNumber(),
        categories: byCategory.map((c) => ({
          categoryId: c.categoryId ?? 'unknown',
          categoryName: c.categoryId ? (catMap.get(c.categoryId) ?? 'Unknown') : 'Unknown',
          totalAmount: (c._sum.amount ?? new Decimal(0)).toNumber(),
          transactionCount: c._count.id,
        })),
      });
    }

    return { userId, userProfile, months };
  }
}
