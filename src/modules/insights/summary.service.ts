import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthSummary(userId: string, year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const [incomeAgg, expenseAgg, topCategoryRows, goals] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: 'income',
          occurredAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: 'expense',
          occurredAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          deletedAt: null,
          type: 'expense',
          occurredAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.savingsGoal.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          name: true,
          currentAmount: true,
          targetAmount: true,
        },
      }),
    ]);

    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [{ type: 'SYSTEM' }, { type: 'CUSTOM', userId }],
        id: {
          in: topCategoryRows.map((row) => row.categoryId).filter((value): value is string => !!value),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryMap = new Map(categories.map((item) => [item.id, item.name]));

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      topCategories: topCategoryRows.map((row) => ({
        categoryName: row.categoryId ? categoryMap.get(row.categoryId) ?? 'Uncategorized' : 'Uncategorized',
        totalExpense: Number(row._sum.amount ?? 0),
      })),
      goalsProgress: goals.map((goal) => {
        const currentAmount = Number(goal.currentAmount);
        const targetAmount = Number(goal.targetAmount);
        const percent = targetAmount > 0 ? Number(((currentAmount / targetAmount) * 100).toFixed(2)) : 0;

        return {
          goalName: goal.name,
          currentAmount,
          targetAmount,
          percent,
        };
      }),
    };
  }
}