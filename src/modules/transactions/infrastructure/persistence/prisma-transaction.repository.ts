import { Injectable } from '@nestjs/common';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import {
  ITransactionRepository,
  TransactionFilters,
  TransactionWithCategory,
  UpdateTransactionParams,
} from '../../domain/ports/transaction.repository';
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
      type: row.type as TransactionType,
      amount: row.amount.toNumber(),
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  private toTransactionWithCategory(row: any): TransactionWithCategory {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId ?? null,
      type: row.type as TransactionType,
      amount: row.amount.toNumber(),
      currency: row.currency,
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      category: row.category ?? null,
    };
  }

  async create(params: {
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    description?: string;
    occurredAt: Date;
  }): Promise<TransactionWithCategory> {
    const row = await this.prisma.transaction.create({
      data: {
        userId: params.userId,
        categoryId: params.categoryId,
        type: params.type as PrismaTransactionType,
        amount: params.amount,
        currency: params.currency,
        description: params.description ?? '',
        occurredAt: params.occurredAt,
      },
      include: { category: { select: { id: true, name: true } } },
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
        ...(filters.from || filters.to
          ? {
              occurredAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      include: { category: { select: { id: true, name: true } } },
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
      include: { category: { select: { id: true, name: true } } },
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
        ...(params.amount !== undefined && { amount: params.amount }),
        ...(params.currency !== undefined && { currency: params.currency }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.occurredAt !== undefined && { occurredAt: params.occurredAt }),
      },
      include: { category: { select: { id: true, name: true } } },
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
}
