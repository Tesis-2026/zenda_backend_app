import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { IBudgetRepository } from '../../domain/ports/budget.repository';
import { BudgetEntity } from '../../domain/budget.entity';

@Injectable()
export class PrismaBudgetsRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async toEntity(
    row: {
      id: string;
      userId: string;
      categoryId: string | null;
      name: string | null;
      amountLimit: { toNumber: () => number };
      month: number;
      year: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      category?: { name: string } | null;
    },
  ): Promise<BudgetEntity> {
    // Transactions explicitly linked to THIS budget (the user picks it at
    // create time, independent of the transaction's category). Expenses reduce
    // the pot; income grows it ("aumentar presupuesto").
    const [spentAgg, incomeAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          budgetId: row.id,
          type: TransactionType.EXPENSE,
          deletedAt: null,
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          budgetId: row.id,
          type: TransactionType.INCOME,
          deletedAt: null,
        },
      }),
    ]);

    return BudgetEntity.create({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      name: row.name,
      amountLimit: row.amountLimit.toNumber(),
      month: row.month,
      year: row.year,
      currentSpent: spentAgg._sum.amount?.toNumber() ?? 0,
      incomeAdded: incomeAgg._sum.amount?.toNumber() ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async create(params: {
    userId: string;
    categoryId?: string;
    name?: string;
    amountLimit: number;
    month: number;
    year: number;
  }): Promise<BudgetEntity> {
    // Revive a soft-deleted record for the same slot instead of inserting a duplicate.
    // This avoids the P2002 unique-constraint violation that occurs when a previously
    // deleted budget is recreated for the same user / category / period.
    const softDeleted = await this.prisma.budget.findFirst({
      where: {
        userId: params.userId,
        categoryId: params.categoryId ?? null,
        month: params.month,
        year: params.year,
        deletedAt: { not: null },
      },
      include: { category: true },
    });

    if (softDeleted) {
      const row = await this.prisma.budget.update({
        where: { id: softDeleted.id },
        data: {
          amountLimit: params.amountLimit,
          name: params.name ?? null,
          deletedAt: null,
        },
        include: { category: true },
      });
      return this.toEntity(row);
    }

    const row = await this.prisma.budget.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId ?? null,
        name: params.name ?? null,
        amountLimit: params.amountLimit,
        month: params.month,
        year: params.year,
      },
      include: { category: true },
    });
    return this.toEntity(row);
  }

  async findAll(params: {
    userId: string;
    month?: number;
    year?: number;
  }): Promise<BudgetEntity[]> {
    const rows = await this.prisma.budget.findMany({
      where: {
        userId: params.userId,
        deletedAt: null,
        ...(params.month !== undefined ? { month: params.month } : {}),
        ...(params.year !== undefined ? { year: params.year } : {}),
      },
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'asc' }],
    });
    return Promise.all(rows.map((r) => this.toEntity(r)));
  }

  async findById(id: string, userId: string): Promise<BudgetEntity | null> {
    const row = await this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
    return row ? this.toEntity(row) : null;
  }

  async update(
    id: string,
    userId: string,
    params: { amountLimit?: number; name?: string },
  ): Promise<BudgetEntity> {
    const row = await this.prisma.budget.update({
      where: { id, userId },
      data: {
        ...(params.amountLimit !== undefined ? { amountLimit: params.amountLimit } : {}),
        ...(params.name !== undefined ? { name: params.name } : {}),
      },
      include: { category: true },
    });
    return this.toEntity(row);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.prisma.budget.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    });
  }

  async findGlobalForPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetEntity | null> {
    const row = await this.prisma.budget.findFirst({
      where: { userId, categoryId: null, month, year, deletedAt: null },
      include: { category: true },
    });
    return row ? this.toEntity(row) : null;
  }

  async countActiveForPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<number> {
    return this.prisma.budget.count({
      where: { userId, month, year, deletedAt: null },
    });
  }

  async findForCategoryAndPeriod(
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<BudgetEntity | null> {
    const row = await this.prisma.budget.findFirst({
      where: { userId, categoryId, month, year, deletedAt: null },
      include: { category: true },
    });
    return row ? this.toEntity(row) : null;
  }
}
