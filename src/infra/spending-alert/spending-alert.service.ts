import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpendingAlertService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * US-016: Returns an anomaly alert if the current month's category spending
   * exceeds the 3-month rolling average by more than 20%.
   */
  async checkAnomaly(
    userId: string,
    categoryId: string,
    transactionDate: Date,
  ): Promise<{ categoryName: string; pctOver: number } | null> {
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth() + 1; // 1-12

    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const currentAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        occurredAt: { gte: currentMonthStart, lte: currentMonthEnd },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const currentTotal = (currentAgg._sum.amount ?? new Decimal(0)).toNumber();
    if (currentTotal === 0) return null;

    // Rolling average over the three months immediately preceding the current one
    const threeMonthsAgo = new Date(year, month - 4, 1);
    const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const historicalAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: TransactionType.EXPENSE,
        occurredAt: { gte: threeMonthsAgo, lte: prevMonthEnd },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const historicalTotal = (historicalAgg._sum.amount ?? new Decimal(0)).toNumber();
    if (historicalTotal === 0) return null; // no baseline — can't compare

    const historicalAvg = historicalTotal / 3;
    const pctOver = ((currentTotal - historicalAvg) / historicalAvg) * 100;
    if (pctOver <= 20) return null;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    return {
      categoryName: category?.name ?? 'Unknown',
      pctOver: Math.round(pctOver),
    };
  }
}
