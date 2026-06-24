import { Injectable } from '@nestjs/common';
import {
  CategorySource as PrismaCategorySource,
  TransactionType as PrismaTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ITransactionRepository,
  TransactionFilters,
  TransactionWithCategory,
  UpdateTransactionParams,
} from '../../domain/ports/transaction.repository';
import { CategorySource } from '../../domain/category-source.enum';
import { TransactionEntity } from '../../domain/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(row: any): TransactionEntity {
    return TransactionEntity.reconstitute({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      accountId: row.accountId ?? null,
      toAccountId: row.toAccountId ?? null,
      type: row.type as TransactionType,
      amount: row.amount.toNumber(),
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      suggestedCategoryId: row.suggestedCategoryId ?? null,
      aiConfidence: row.aiConfidence ? row.aiConfidence.toNumber() : null,
      categorySource: row.categorySource as CategorySource,
    });
  }

  private toTransactionWithCategory(row: any): TransactionWithCategory {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId ?? null,
      accountId: row.accountId ?? null,
      toAccountId: row.toAccountId ?? null,
      type: row.type as TransactionType,
      amount: row.amount.toNumber(),
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      category: row.category ?? null,
      account: row.account ?? null,
      toAccount: row.toAccount ?? null,
      suggestedCategoryId: row.suggestedCategoryId ?? null,
      aiConfidence: row.aiConfidence ? row.aiConfidence.toNumber() : null,
      categorySource: row.categorySource as CategorySource,
    };
  }

  async create(params: {
    userId: string;
    categoryId?: string | null;
    accountId?: string | null;
    toAccountId?: string | null;
    budgetId?: string | null;
    type: TransactionType;
    amount: number;
    currency: string;
    description?: string;
    occurredAt: Date;
    suggestedCategoryId?: string | null;
    aiConfidence?: number | null;
    categorySource: CategorySource;
  }): Promise<TransactionWithCategory> {
    const row = await this.prisma.transaction.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId ?? null,
        accountId: params.accountId ?? null,
        toAccountId: params.toAccountId ?? null,
        budgetId: params.budgetId ?? null,
        type: params.type as PrismaTransactionType,
        amount: params.amount,
        currency: params.currency,
        description: params.description ?? '',
        occurredAt: params.occurredAt,
        suggestedCategoryId: params.suggestedCategoryId ?? null,
        aiConfidence: params.aiConfidence ?? null,
        categorySource: params.categorySource as PrismaCategorySource,
      },
      include: this.transactionInclude(),
    });
    return this.toTransactionWithCategory(row);
  }

  async findAll(
    userId: string,
    filters: TransactionFilters,
  ): Promise<TransactionWithCategory[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(filters.type && { type: filters.type as PrismaTransactionType }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.accountId && {
          OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }],
        }),
        ...(filters.from || filters.to
          ? {
              occurredAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
        ...(filters.minAmount !== undefined || filters.maxAmount !== undefined
          ? {
              amount: {
                ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
                ...(filters.maxAmount !== undefined && { lte: filters.maxAmount }),
              },
            }
          : {}),
        ...(filters.search && {
          description: { contains: filters.search, mode: 'insensitive' as const },
        }),
      },
      orderBy: { occurredAt: filters.sort === 'asc' ? 'asc' : 'desc' },
      include: this.transactionInclude(),
      ...(filters.skip !== undefined && { skip: filters.skip }),
      take: filters.take ?? 100,
    });
    return rows.map((r) => this.toTransactionWithCategory(r));
  }

  async findById(id: string, userId: string): Promise<TransactionEntity | null> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByIdWithCategory(id: string, userId: string): Promise<TransactionWithCategory | null> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: this.transactionInclude(),
    });
    return row ? this.toTransactionWithCategory(row) : null;
  }

  async update(id: string, userId: string, params: UpdateTransactionParams): Promise<TransactionWithCategory> {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) throw new Error('Transaction not found or access denied');

    const row = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(params.categoryId !== undefined && { categoryId: params.categoryId }),
        ...(params.accountId !== undefined && { accountId: params.accountId }),
        ...(params.toAccountId !== undefined && { toAccountId: params.toAccountId }),
        ...(params.type !== undefined && { type: params.type as PrismaTransactionType }),
        ...(params.amount !== undefined && { amount: params.amount }),
        ...(params.currency !== undefined && { currency: params.currency }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.occurredAt !== undefined && { occurredAt: params.occurredAt }),
        ...(params.budgetId !== undefined && { budgetId: params.budgetId }),
        ...(params.categorySource !== undefined && {
          categorySource: params.categorySource as PrismaCategorySource,
        }),
      },
      include: this.transactionInclude(),
    });
    return this.toTransactionWithCategory(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hasConsecutiveDays(userId: string, days: number): Promise<boolean> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const rows = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null, occurredAt: { gte: from, lte: now } },
      select: { occurredAt: true },
    });
    const distinctDates = new Set(rows.map((r) => r.occurredAt.toISOString().slice(0, 10)));
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      if (!distinctDates.has(d.toISOString().slice(0, 10))) return false;
    }
    return true;
  }

  private transactionInclude() {
    return {
      category: { select: { id: true, name: true, icon: true } },
      account: { select: { id: true, name: true, type: true, currency: true } },
      toAccount: { select: { id: true, name: true, type: true, currency: true } },
    };
  }
}
