import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { SpendingContext, UserProfile } from '../../../../infra/ai/AiProvider';
import {
  ConfidenceInterval,
  ConfidenceLevel,
  PredictionEntity,
  PredictionType,
  deriveConfidenceInterval,
} from '../../domain/prediction.entity';
import { IPredictionRepository } from '../../domain/ports/prediction.repository';

type PredictionRow = {
  id: string;
  userId: string;
  period: string;
  type: TransactionType;
  predictedTotal: Decimal;
  predictedByCategory: unknown;
  confidenceInterval: unknown;
  confidenceLevel: string | null;
  narrative: string | null;
  modelVersion: string | null;
  actualTotal: Decimal | null;
  accuracy: Decimal | null;
  createdAt: Date;
};

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
    const data = this.toWriteData(prediction);
    const row = await this.prisma.prediction.upsert({
      where: {
        userId_period_type: {
          userId: prediction.userId,
          period: prediction.period,
          type: prediction.type as TransactionType,
        },
      },
      create: { id: prediction.id, ...data },
      update: data,
    });
    return this.toEntity(row);
  }

  async save(prediction: Omit<PredictionEntity, 'id' | 'createdAt'>): Promise<PredictionEntity> {
    const row = await this.prisma.prediction.create({
      data: this.toWriteData(prediction),
    });
    return this.toEntity(row);
  }

  async getSpendingContext(userId: string, monthsBack: number): Promise<SpendingContext> {
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
      const cats = await this.prisma.category.findMany({ where: { id: { in: catIds }, deletedAt: null }, select: { id: true, name: true } });
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

  countByUser(userId: string): Promise<number> {
    return this.prisma.prediction.count({ where: { userId } });
  }

  async recordActuals(
    predictionId: string,
    actualTotal: number,
    accuracyPct: number | null,
  ): Promise<PredictionEntity> {
    const row = await this.prisma.prediction.update({
      where: { id: predictionId },
      data: {
        actualTotal: new Decimal(actualTotal),
        accuracy: accuracyPct === null ? null : new Decimal(accuracyPct),
      },
    });
    return this.toEntity(row);
  }

  // ── Read mapping ─────────────────────────────────────────────────

  private toEntity(row: PredictionRow): PredictionEntity {
    const predictedTotal = row.predictedTotal.toNumber();

    // Backward compatibility with the legacy ARCH-04 packed format
    // (`<version>|confidence:<level>|narrative:<text>`). New writes
    // populate the proper columns; the migration backfilled most old
    // rows, but if anything slipped through we still parse it here.
    const legacy = parseLegacyPackedModelVersion(row.modelVersion);
    const confidenceLevel = (row.confidenceLevel ?? legacy.confidenceLevel ?? 'low') as ConfidenceLevel;
    const narrative = row.narrative ?? legacy.narrative ?? '';
    const modelVersion = legacy.version ?? row.modelVersion ?? 'unknown';

    const intervalRaw = row.confidenceInterval as
      | { lower?: unknown; upper?: unknown }
      | null;
    const interval: ConfidenceInterval =
      intervalRaw && typeof intervalRaw.lower === 'number' && typeof intervalRaw.upper === 'number'
        ? { lower: intervalRaw.lower, upper: intervalRaw.upper }
        : deriveConfidenceInterval(predictedTotal, confidenceLevel);

    return new PredictionEntity(
      row.id,
      row.userId,
      row.period,
      row.type as PredictionType,
      predictedTotal,
      (row.predictedByCategory as Array<{ categoryId: string; categoryName: string; amount: number }>) ?? [],
      confidenceLevel,
      interval,
      narrative,
      modelVersion,
      row.actualTotal?.toNumber() ?? null,
      row.accuracy?.toNumber() ?? null,
      row.createdAt,
    );
  }

  // ── Write mapping ────────────────────────────────────────────────

  private toWriteData(prediction: Omit<PredictionEntity, 'createdAt' | 'id'> | Omit<PredictionEntity, 'createdAt'>) {
    return {
      userId: prediction.userId,
      period: prediction.period,
      type: prediction.type as TransactionType,
      predictedTotal: new Decimal(prediction.predictedTotal),
      predictedByCategory: (prediction.predictedByCategory as unknown) as Prisma.InputJsonValue,
      confidenceInterval: prediction.confidenceInterval as unknown as Prisma.InputJsonValue,
      confidenceLevel: prediction.confidenceLevel,
      narrative: prediction.narrative,
      modelVersion: prediction.modelVersion,
    };
  }
}

/**
 * Parses the pre-B17 packed `modelVersion` string:
 *   `"<version>|confidence:<level>|narrative:<text>"`
 *
 * Returns `{ version: null }` when the input isn't in that format, so
 * the caller can fall back to the proper column instead.
 */
function parseLegacyPackedModelVersion(raw: string | null): {
  version: string | null;
  confidenceLevel: ConfidenceLevel | null;
  narrative: string | null;
} {
  if (!raw || !raw.includes('|')) {
    return { version: raw, confidenceLevel: null, narrative: null };
  }
  const parts = raw.split('|');
  const version = parts[0] ?? null;
  let confidenceLevel: ConfidenceLevel | null = null;
  let narrative: string | null = null;
  for (const part of parts.slice(1)) {
    if (part.startsWith('confidence:')) {
      const v = part.slice('confidence:'.length);
      if (v === 'high' || v === 'medium' || v === 'low') confidenceLevel = v;
    } else if (part.startsWith('narrative:')) {
      narrative = part.slice('narrative:'.length);
    }
  }
  return { version, confidenceLevel, narrative };
}
