import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { FinancialProgressEntity } from '../../domain/financial-progress.entity';
import {
  IFinancialProgressRepository,
  UpsertFinancialProgressParams,
} from '../../domain/ports/financial-progress.repository';

type Row = {
  id: string;
  userId: string;
  period: string;
  budgetComplianceScore: Prisma.Decimal | null;
  savingsRatePct: Prisma.Decimal | null;
  overspendCategoriesCount: number;
  recommendationsShown: number;
  recommendationsAccepted: number;
  quizzesCompleted: number;
  avgQuizScore: Prisma.Decimal | null;
  createdAt: Date;
};

@Injectable()
export class PrismaFinancialProgressRepository
  implements IFinancialProgressRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: Row): FinancialProgressEntity {
    return FinancialProgressEntity.create({
      id: row.id,
      userId: row.userId,
      period: row.period,
      budgetComplianceScore: row.budgetComplianceScore?.toNumber() ?? null,
      savingsRatePct: row.savingsRatePct?.toNumber() ?? null,
      overspendCategoriesCount: row.overspendCategoriesCount,
      recommendationsShown: row.recommendationsShown,
      recommendationsAccepted: row.recommendationsAccepted,
      quizzesCompleted: row.quizzesCompleted,
      avgQuizScore: row.avgQuizScore?.toNumber() ?? null,
      createdAt: row.createdAt,
    });
  }

  async findByUser(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<FinancialProgressEntity[]> {
    const rows = await this.prisma.userFinancialProgress.findMany({
      where: {
        userId: params.userId,
        ...(params.from !== undefined || params.to !== undefined
          ? {
              period: {
                ...(params.from !== undefined ? { gte: params.from } : {}),
                ...(params.to !== undefined ? { lte: params.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { period: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findByUserAndPeriod(
    userId: string,
    period: string,
  ): Promise<FinancialProgressEntity | null> {
    const row = await this.prisma.userFinancialProgress.findUnique({
      where: { userId_period: { userId, period } },
    });
    return row ? this.toEntity(row) : null;
  }

  async upsert(
    params: UpsertFinancialProgressParams,
  ): Promise<FinancialProgressEntity> {
    const row = await this.prisma.userFinancialProgress.upsert({
      where: { userId_period: { userId: params.userId, period: params.period } },
      create: {
        userId: params.userId,
        period: params.period,
        budgetComplianceScore: params.budgetComplianceScore ?? null,
        savingsRatePct: params.savingsRatePct ?? null,
        overspendCategoriesCount: params.overspendCategoriesCount ?? 0,
        recommendationsShown: params.recommendationsShown ?? 0,
        recommendationsAccepted: params.recommendationsAccepted ?? 0,
        quizzesCompleted: params.quizzesCompleted ?? 0,
        avgQuizScore: params.avgQuizScore ?? null,
      },
      update: {
        ...(params.budgetComplianceScore !== undefined
          ? { budgetComplianceScore: params.budgetComplianceScore }
          : {}),
        ...(params.savingsRatePct !== undefined
          ? { savingsRatePct: params.savingsRatePct }
          : {}),
        ...(params.overspendCategoriesCount !== undefined
          ? { overspendCategoriesCount: params.overspendCategoriesCount }
          : {}),
        ...(params.recommendationsShown !== undefined
          ? { recommendationsShown: params.recommendationsShown }
          : {}),
        ...(params.recommendationsAccepted !== undefined
          ? { recommendationsAccepted: params.recommendationsAccepted }
          : {}),
        ...(params.quizzesCompleted !== undefined
          ? { quizzesCompleted: params.quizzesCompleted }
          : {}),
        ...(params.avgQuizScore !== undefined
          ? { avgQuizScore: params.avgQuizScore }
          : {}),
      },
    });
    return this.toEntity(row);
  }
}
