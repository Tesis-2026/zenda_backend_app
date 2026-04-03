import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  IInsightsRepository,
  MonthComparisonEntry,
  MonthSummaryData,
  MonthSummaryParams,
  PeriodSummaryData,
  PeriodSummaryParams,
} from '../../domain/ports/insights.repository';

@Injectable()
export class PrismaInsightsRepository implements IInsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthSummary(params: MonthSummaryParams): Promise<MonthSummaryData> {
    return this.fetchPeriodSummary(params.userId, params.from, params.to);
  }

  async getPeriodSummary(params: PeriodSummaryParams): Promise<PeriodSummaryData> {
    return this.fetchPeriodSummary(params.userId, params.from, params.to);
  }

  async getMonthComparison(userId: string, months: number): Promise<MonthComparisonEntry[]> {
    const now = new Date();
    const entries: MonthComparisonEntry[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);

      const [incomeAgg, expenseAgg] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.INCOME, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: TransactionType.EXPENSE, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = (incomeAgg._sum.amount ?? new Decimal(0)).toNumber();
      const totalExpense = (expenseAgg._sum.amount ?? new Decimal(0)).toNumber();

      entries.push({ year, month, totalIncome, totalExpense, netBalance: totalIncome - totalExpense });
    }

    return entries;
  }

  private async fetchPeriodSummary(userId: string, from: Date, to: Date): Promise<PeriodSummaryData> {
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
