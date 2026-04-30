import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  DailyBreakdown,
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

  async getDailyBreakdown(params: PeriodSummaryParams): Promise<DailyBreakdown[]> {
    const { userId, from, to } = params;
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: from, lte: to }, deletedAt: null },
      select: { amount: true, type: true, occurredAt: true },
    });

    const dayMap = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const key = t.occurredAt.toISOString().slice(0, 10);
      const existing = dayMap.get(key) ?? { income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) {
        existing.income += t.amount.toNumber();
      } else {
        existing.expense += t.amount.toNumber();
      }
      dayMap.set(key, existing);
    }

    const result: DailyBreakdown[] = [];
    const cur = new Date(from);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const data = dayMap.get(key) ?? { income: 0, expense: 0 };
      result.push({ date: key, totalIncome: data.income, totalExpense: data.expense });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
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
