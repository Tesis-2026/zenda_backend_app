import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface GetMonthSummaryQuery {
  userId: string;
  year: number;
  month: number;
}

export interface MonthSummaryResult {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  topCategories: { name: string; amount: number }[];
  goalsProgress: {
    name: string;
    currentAmount: number;
    targetAmount: number;
    progressPercent: number;
  }[];
}

@Injectable()
export class GetMonthSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMonthSummaryQuery): Promise<MonthSummaryResult> {
    const { userId, year, month } = query;
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const [incomeAgg, expenseAgg, expenseByCategory, goals] = await Promise.all([
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
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.savingsGoal.findMany({
        where: { userId, deletedAt: null },
      }),
    ]);

    const categoryIds = expenseByCategory
      .map((e) => e.categoryId)
      .filter((id): id is string => id !== null);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const totalIncome = (incomeAgg._sum.amount ?? new Decimal(0)).toNumber();
    const totalExpense = (expenseAgg._sum.amount ?? new Decimal(0)).toNumber();

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      topCategories: expenseByCategory.map((e) => ({
        name: e.categoryId ? (categoryMap.get(e.categoryId) ?? 'Unknown') : 'Unknown',
        amount: (e._sum.amount ?? new Decimal(0)).toNumber(),
      })),
      goalsProgress: goals.map((g) => {
        const current = g.currentAmount.toNumber();
        const target = g.targetAmount.toNumber();
        return {
          name: g.name,
          currentAmount: current,
          targetAmount: target,
          progressPercent: target > 0 ? Math.min(100, (current / target) * 100) : 0,
        };
      }),
    };
  }
}
