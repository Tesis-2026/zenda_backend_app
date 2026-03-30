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
      amountLimit: { toNumber: () => number };
      month: number;
      year: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      category?: { name: string } | null;
    },
  ): Promise<BudgetEntity> {
    const from = new Date(row.year, row.month - 1, 1);
    const to = new Date(row.year, row.month, 1);

    const spentAgg = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: row.userId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        occurredAt: { gte: from, lt: to },
        ...(row.categoryId !== null ? { categoryId: row.categoryId } : {}),
      },
    });

    return BudgetEntity.create({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      amountLimit: row.amountLimit.toNumber(),
      month: row.month,
      year: row.year,
      currentSpent: spentAgg._sum.amount?.toNumber() ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  async create(params: {
    userId: string;
    categoryId?: string;
    amountLimit: number;
    month: number;
    year: number;
  }): Promise<BudgetEntity> {
    const row = await this.prisma.budget.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId ?? null,
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
    params: { amountLimit: number },
  ): Promise<BudgetEntity> {
    const row = await this.prisma.budget.update({
      where: { id },
      data: { amountLimit: params.amountLimit },
      include: { category: true },
    });
    // verify ownership (findById already confirmed it before calling update)
    void userId;
    return this.toEntity(row);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    void userId;
  }
}
