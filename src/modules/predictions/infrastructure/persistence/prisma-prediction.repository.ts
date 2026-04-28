import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { SpendingContext } from '../../../../infra/ai/AiProvider';
import { PredictionEntity, PredictionType } from '../../domain/prediction.entity';
import { IPredictionRepository } from '../../domain/ports/prediction.repository';

@Injectable()
export class PrismaPredictionRepository implements IPredictionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndPeriod(
    userId: string,
    period: string,
    type: PredictionType,
  ): Promise<PredictionEntity | null> {
    const row = await this.prisma.prediction.findUnique({
      where: { userId_period_type: { userId, period, type: type as TransactionType } },
    });
    if (!row) return null;
    return this.toEntity(row);
  }

  async upsert(prediction: Omit<PredictionEntity, 'createdAt'>): Promise<PredictionEntity> {
    const { id, userId, period, type, predictedTotal, predictedByCategory, confidenceLevel, narrative, modelVersion } =
      prediction;
    const row = await this.prisma.prediction.upsert({
      where: { userId_period_type: { userId, period, type: type as TransactionType } },
      create: {
        id,
        userId,
        period,
        type: type as TransactionType,
        predictedTotal: new Decimal(predictedTotal),
        predictedByCategory: predictedByCategory as object[],
        confidenceInterval: { lower: predictedTotal * 0.85, upper: predictedTotal * 1.15 },
        modelVersion: `${modelVersion}|confidence:${confidenceLevel}|narrative:${narrative}`,
      },
      update: {
        predictedTotal: new Decimal(predictedTotal),
        predictedByCategory: predictedByCategory as object[],
        modelVersion: `${modelVersion}|confidence:${confidenceLevel}|narrative:${narrative}`,
      },
    });
    return this.toEntity(row);
  }

  async save(prediction: Omit<PredictionEntity, 'id' | 'createdAt'>): Promise<PredictionEntity> {
    const { userId, period, type, predictedTotal, predictedByCategory, confidenceLevel, narrative, modelVersion } =
      prediction;
    const row = await this.prisma.prediction.create({
      data: {
        userId,
        period,
        type: type as TransactionType,
        predictedTotal: new Decimal(predictedTotal),
        predictedByCategory: predictedByCategory as object[],
        modelVersion: `${modelVersion}|confidence:${confidenceLevel}|narrative:${narrative}`,
      },
    });
    return this.toEntity(row);
  }

  async getSpendingContext(userId: string, monthsBack: number): Promise<SpendingContext> {
    const now = new Date();
    const months: SpendingContext['months'] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);
      const period = `${year}-${String(month).padStart(2, '0')}`;

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
          where: { userId, occurredAt: { gte: from, lte: to }, deletedAt: null },
          _sum: { amount: true },
          _count: { id: true },
        }),
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

    return { userId, months };
  }

  private toEntity(row: {
    id: string;
    userId: string;
    period: string;
    type: TransactionType;
    predictedTotal: Decimal;
    predictedByCategory: unknown;
    modelVersion: string | null;
    actualTotal: Decimal | null;
    accuracy: Decimal | null;
    createdAt: Date;
  }): PredictionEntity {
    // modelVersion field encodes confidence+narrative: "version|confidence:X|narrative:Y"
    const parts = row.modelVersion?.split('|') ?? [];
    const version = parts[0] ?? 'unknown';
    const confidence = (parts[1]?.replace('confidence:', '') ?? 'low') as 'high' | 'medium' | 'low';
    const narrative = parts[2]?.replace('narrative:', '') ?? '';

    return new PredictionEntity(
      row.id,
      row.userId,
      row.period,
      row.type as PredictionType,
      row.predictedTotal.toNumber(),
      (row.predictedByCategory as Array<{ categoryId: string; categoryName: string; amount: number }>) ?? [],
      confidence,
      narrative,
      version,
      row.actualTotal?.toNumber() ?? null,
      row.accuracy?.toNumber() ?? null,
      row.createdAt,
    );
  }
}
