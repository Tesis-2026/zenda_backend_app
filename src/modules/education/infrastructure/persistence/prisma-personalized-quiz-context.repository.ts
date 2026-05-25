import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  IPersonalizedQuizContextPort,
  PersonalizedQuizMonthlyTotals,
  PersonalizedQuizUserProfile,
} from '../../domain/ports/personalized-quiz-context.port';

@Injectable()
export class PrismaPersonalizedQuizContextRepository
  implements IPersonalizedQuizContextPort
{
  constructor(private readonly prisma: PrismaService) {}

  async countQuizPersonalizedAttemptsToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.analyticsEvent.count({
      where: {
        userId,
        eventType: 'quiz_personalized',
        createdAt: { gte: startOfDay },
      },
    });
  }

  async getUserProfile(userId: string): Promise<PersonalizedQuizUserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialLiteracyLevel: true,
        age: true,
        university: true,
        incomeType: true,
        averageMonthlyIncome: true,
      },
    });
    if (!user) return null;
    return {
      financialLiteracyLevel:
        (user.financialLiteracyLevel as PersonalizedQuizUserProfile['financialLiteracyLevel']) ?? null,
      age: user.age,
      university: user.university,
      incomeType: user.incomeType,
      averageMonthlyIncome: user.averageMonthlyIncome?.toNumber() ?? null,
    };
  }

  async listSpendingByMonth(
    userId: string,
    monthsBack: number,
  ): Promise<PersonalizedQuizMonthlyTotals[]> {
    const now = new Date();
    const months: PersonalizedQuizMonthlyTotals[] = [];

    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [incomeAgg, expenseAgg, byCategory] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.INCOME, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const catIds = byCategory
        .map((r) => r.categoryId)
        .filter((id): id is string => id !== null);
      const cats = catIds.length
        ? await this.prisma.category.findMany({
            where: { id: { in: catIds }, deletedAt: null },
            select: { id: true, name: true },
          })
        : [];
      const catMap = new Map(cats.map((c) => [c.id, c.name]));

      months.push({
        period,
        totalIncome: (incomeAgg._sum.amount ?? new Decimal(0)).toNumber(),
        totalExpenses: (expenseAgg._sum.amount ?? new Decimal(0)).toNumber(),
        categories: byCategory.map((r) => ({
          categoryId: r.categoryId ?? 'unknown',
          categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? 'Unknown') : 'Unknown',
          totalAmount: (r._sum.amount ?? new Decimal(0)).toNumber(),
          transactionCount: r._count.id,
        })),
      });
    }

    return months;
  }
}
